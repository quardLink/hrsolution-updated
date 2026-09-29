import { Router, type IRouter, type Request, type Response } from "express";
import express from "express";
import {
  findBiometricDeviceBySerial,
  touchBiometricDeviceLastSeen,
  updateDeviceClockOffset,
  type BiometricDevice,
} from "../lib/biometricDevices";
import { findEmployeeByPunchPin } from "../lib/employees";
import { appendAttendanceRow, attendancePunchExists, getLastAttendanceLog } from "../lib/attendanceLogs";
import { getOrgById } from "../lib/orgs";
import type { Logger } from "pino";

const router: IRouter = Router();

// ZKTeco's ADMS/PUSH protocol (what the F22 speaks over "Comm > Cloud
// Server" in its menu) is plain tab/newline-delimited text, not JSON, and
// firmware is inconsistent about the Content-Type header it sends (often
// text/plain, sometimes nothing at all). Parse every request on this
// router as raw text regardless of header, before the app's global
// express.json() would otherwise leave req.body empty.
//
// This router is mounted at "/iclock" directly on the app (not under
// /api) in app.ts, because the terminal's request paths (/iclock/cdata
// etc.) are hardcoded in its firmware — only the host/port are
// configurable on the device. It must stay scoped to that prefix: this
// text-body middleware runs for every request that reaches the router,
// and mounting it unscoped would consume the body of unrelated /api/*
// requests (e.g. login) before express.json() ever saw it.
router.use(express.text({ type: () => true, limit: "2mb" }));

function serialFromQuery(req: Request): string | null {
  const sn = req.query.SN;
  return typeof sn === "string" && sn.trim() ? sn.trim() : null;
}

function textReply(res: Response, body: string): void {
  res.type("text/plain").send(body);
}

// Handshake / periodic options check-in. The exact field values barely
// matter to the firmware beyond Realtime=1 (push each punch immediately
// instead of batching) and Encrypt=0 (we don't implement the optional
// payload encryption) — this is the same minimal reply every open-source
// ADMS server implementation replies with.
router.get("/cdata", (req: Request, res: Response): void => {
  const sn = serialFromQuery(req);
  req.log.info({ sn }, "ZKTeco device handshake");
  textReply(
    res,
    [`GET OPTION FROM: ${sn ?? ""}`, "Stamp=9999", "OpStamp=9999", "ErrorDelay=60", "Delay=30", "Realtime=1", "Encrypt=0"].join(
      "\n",
    ),
  );
});

router.post("/cdata", async (req: Request, res: Response): Promise<void> => {
  const sn = serialFromQuery(req);
  const table = typeof req.query.table === "string" ? req.query.table : "";
  const body = typeof req.body === "string" ? req.body : "";

  if (!sn) {
    textReply(res, "OK");
    return;
  }

  const device = await findBiometricDeviceBySerial(sn);
  if (!device) {
    req.log.warn(
      { sn },
      "ZKTeco push from an unregistered device — add this serial number under Settings > Devices to start accepting its punches",
    );
    textReply(res, "OK");
    return;
  }

  void touchBiometricDeviceLastSeen(device.id, req.ip);

  if (table === "ATTLOG") {
    await ingestAttLog(device, body, req.log);
  } else if (body.trim()) {
    req.log.info({ sn, table }, "Ignoring non-attendance ZKTeco push (user/fingerprint enrollment stays device-side)");
  }

  textReply(res, "OK");
});

// No command queue is implemented — the terminal is provisioned by hand
// (fingerprints enrolled on its own keypad, PINs entered in Settings), so
// there's never a pending command for it to pick up here.
router.get("/getrequest", (_req: Request, res: Response): void => {
  textReply(res, "OK");
});

router.post("/devicecmd", (_req: Request, res: Response): void => {
  textReply(res, "OK");
});

// The F22 has no camera, but other terminals in this product line push a
// photo alongside a punch; ack it so firmware that probes this path
// doesn't sit there retrying.
router.post("/fdata", (_req: Request, res: Response): void => {
  textReply(res, "OK");
});

// ATTLOG's 4th tab-separated field ("Verify") is the terminal's own
// verification-method code. Values vary a bit across ZKTeco firmware
// generations, but this covers the common ones; an unrecognized code
// falls back to "fingerprint" since that's this device family's primary
// (usually only) modality — better than mislabeling it "unknown" for a
// value that just isn't in this table yet.
function mapZktVerifyCode(code: string | undefined): string {
  switch (code?.trim()) {
    case "0":
      return "password";
    case "2":
      return "card";
    case "4":
    case "15":
      return "face";
    case "1":
    default:
      return "fingerprint";
  }
}

async function ingestAttLog(device: BiometricDevice, body: string, log: Logger): Promise<void> {
  const org = await getOrgById(device.orgId);
  const timeZone = org?.timezone ?? "Asia/Riyadh";

  const lines = body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // A single push can carry a whole backlog of buffered punches at once —
  // exactly the case calibration most needs to get right. Thread the
  // (possibly just-updated) device state from one punch to the next so a
  // calibration made earlier in this same batch is visible to later lines
  // in it, not just to the next separate HTTP request.
  let current = device;
  for (const line of lines) {
    const fields = line.split("\t");
    const pin = fields[0]?.trim();
    const rawTime = fields[1]?.trim();
    if (!pin || !rawTime) continue;
    const authType = mapZktVerifyCode(fields[3]);

    try {
      current = await ingestPunch(current, timeZone, pin, rawTime, authType, log);
    } catch (err) {
      log.error({ err, pin, rawTime }, "Failed to record fingerprint punch");
    }
  }
}

// ZKTeco's own clock can't be trusted OR fixed by hand: ADMS resyncs the
// device's hardware clock off this server's HTTP response on every
// heartbeat, so any manual correction on the keypad just gets reset on the
// next check-in, combined with the unit's own (often wrong) GMT offset.
// But the device's own reported time in each ATTLOG line is the only way
// to recover the true time of a punch that was buffered offline and
// uploaded late (see calibrateClock below) — so instead of ignoring it
// outright, we track the gap between it and the server's own clock and
// use that as a correction factor, refreshed on every real-time punch.
const MIN_PUNCH_GAP_MS = 2 * 60 * 1000; // treat a repeat punch this close together as a double tap, not a real event
const CALIBRATION_TOLERANCE_MS = 3 * 60 * 1000; // gap this close to the known offset = an ordinary real-time push
const CANDIDATE_CONFIRM_TOLERANCE_MS = 2 * 60 * 1000; // how close two outlier gaps must be to confirm a real clock change
const CANDIDATE_MAX_AGE_MS = 15 * 60 * 1000; // a candidate offset older than this can't confirm a later outlier

// ZKT ATTLOG's own timestamp field, e.g. "2026-09-23 16:59:00" — a wall
// clock reading in whatever (possibly wrong) timezone/offset the device
// itself is on. Parsed as a bare local Date purely as an arbitrary anchor
// point; calibrateClock's offset bridges it to real time, so how this is
// interpreted doesn't matter as long as it's done consistently.
function parseDeviceTimestamp(raw: string): Date | null {
  const m = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const [year, month, day, hour, minute, second] = m.slice(1).map(Number);
  return new Date(year, month - 1, day, hour, minute, second);
}

interface ClockCalibration {
  occurredAt: Date;
  syncedLate: boolean;
  persist: { clockOffsetMs?: number; offsetCandidateMs?: number | null; offsetCandidateAt?: Date | null } | null;
}

// Decides what this punch's real occurredAt was, and whether the device's
// stored clockOffsetMs should change. See the constants above for the
// three cases: first-ever punch (seed the offset), an ordinary real-time
// push (small drift, refine the offset), or an outlier (buffered backlog
// or a real clock change — corrected with the OLD trusted offset unless a
// second outlier confirms the new gap).
function calibrateClock(device: BiometricDevice, deviceTime: Date, serverNow: Date): ClockCalibration {
  const rawGapMs = serverNow.getTime() - deviceTime.getTime();

  if (device.clockOffsetMs === null) {
    return {
      occurredAt: serverNow,
      syncedLate: false,
      persist: { clockOffsetMs: rawGapMs, offsetCandidateMs: null, offsetCandidateAt: null },
    };
  }

  const diff = rawGapMs - device.clockOffsetMs;
  if (Math.abs(diff) <= CALIBRATION_TOLERANCE_MS) {
    const newOffset = Math.round(device.clockOffsetMs * 0.8 + rawGapMs * 0.2);
    return {
      occurredAt: new Date(deviceTime.getTime() + newOffset),
      syncedLate: false,
      persist: { clockOffsetMs: newOffset, offsetCandidateMs: null, offsetCandidateAt: null },
    };
  }

  const candidate = device.offsetCandidateMs;
  const candidateFresh =
    candidate !== null &&
    device.offsetCandidateAt !== null &&
    serverNow.getTime() - device.offsetCandidateAt.getTime() <= CANDIDATE_MAX_AGE_MS;

  if (candidateFresh && Math.abs(rawGapMs - candidate!) <= CANDIDATE_CONFIRM_TOLERANCE_MS) {
    // Two outliers in a row with a consistent gap — this is a lasting
    // clock change (e.g. someone corrected the device's timezone), not a
    // one-off buffered batch. Adopt it as the new calibrated offset.
    return {
      occurredAt: new Date(deviceTime.getTime() + rawGapMs),
      syncedLate: false,
      persist: { clockOffsetMs: rawGapMs, offsetCandidateMs: null, offsetCandidateAt: null },
    };
  }

  return {
    occurredAt: new Date(deviceTime.getTime() + device.clockOffsetMs),
    syncedLate: true,
    persist: { offsetCandidateMs: rawGapMs, offsetCandidateAt: serverNow },
  };
}

// Returns the (possibly calibration-updated) device state, so a batch push
// covering several punches can carry that update from one line to the
// next — see the comment on `current` in ingestAttLog.
async function ingestPunch(
  device: BiometricDevice,
  timeZone: string,
  pin: string,
  rawTime: string,
  authType: string,
  log: Logger,
): Promise<BiometricDevice> {
  const employee = await findEmployeeByPunchPin(device.orgId, pin);
  if (!employee) {
    log.warn({ pin, orgId: device.orgId }, "Fingerprint punch for an unrecognized PIN — set it as the employee's biometric PIN");
    return device;
  }

  // The terminal retries a batch until it gets "OK" back, so the same
  // punch can arrive more than once — its own raw timestamp string is
  // resent identically on a retry, which is what makes it a safe dedup
  // key even though it's not trusted as the actual event time below.
  if (await attendancePunchExists(device.orgId, employee.id, device.id, rawTime)) return device;

  const serverNow = new Date();
  const deviceTime = parseDeviceTimestamp(rawTime);
  const calibration: ClockCalibration = deviceTime
    ? calibrateClock(device, deviceTime, serverNow)
    : { occurredAt: serverNow, syncedLate: false, persist: null };

  const updatedDevice = calibration.persist ? { ...device, ...calibration.persist } : device;
  if (calibration.persist) {
    await updateDeviceClockOffset(device.id, calibration.persist);
  }
  const occurredAt = calibration.occurredAt;

  // The terminal itself doesn't reliably tell us check-in vs check-out (a
  // bare keypad F22 has no state selector) — toggle off whatever this
  // employee's last event was today, same as pairDailySessions already
  // assumes downstream.
  const last = await getLastAttendanceLog(device.orgId, employee.id);

  // A double tap on the sensor (the first read looked like it failed) would
  // otherwise toggle into a phantom checkin-then-checkout microsegment
  // seconds apart. Only guards against this terminal's own last punch —
  // an employee genuinely checking out on the kiosk shortly after a
  // terminal check-in is a deliberate action, not a misread.
  if (last && last.biometricDeviceId === device.id && Math.abs(occurredAt.getTime() - last.occurredAt.getTime()) < MIN_PUNCH_GAP_MS) {
    log.info(
      { pin, orgId: device.orgId, employeeId: employee.id },
      "Ignoring fingerprint punch within 2 minutes of this employee's last punch on the same terminal (likely a double tap)",
    );
    return updatedDevice;
  }

  const sameLocalDay =
    last !== null &&
    occurredAt.toLocaleDateString("en-CA", { timeZone }) === last.occurredAt.toLocaleDateString("en-CA", { timeZone });
  const action = sameLocalDay && last!.action === "checkin" ? "checkout" : "checkin";

  const timestamp = occurredAt.toLocaleString("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  await appendAttendanceRow({
    orgId: device.orgId,
    employeeName: employee.name,
    employeeId: employee.id,
    action,
    session: action === "checkin" ? "morning" : "evening",
    timestamp,
    status: "logged",
    message: action === "checkin" ? "Check-in recorded successfully." : "Check-out recorded successfully.",
    biometricDeviceId: device.id,
    sourceRawTimestamp: rawTime,
    occurredAt,
    syncedLate: calibration.syncedLate,
    authType,
  });

  return updatedDevice;
}

export default router;
