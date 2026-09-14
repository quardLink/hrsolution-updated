import { Router, type IRouter, type Request, type Response } from "express";
import express from "express";
import {
  findBiometricDeviceBySerial,
  touchBiometricDeviceLastSeen,
  type BiometricDevice,
} from "../lib/biometricDevices";
import { findEmployeeByPunchPin } from "../lib/employees";
import { appendAttendanceRow, recentDuplicatePunch, getLastAttendanceLog } from "../lib/attendanceLogs";
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

async function ingestAttLog(device: BiometricDevice, body: string, log: Logger): Promise<void> {
  const org = await getOrgById(device.orgId);
  const timeZone = org?.timezone ?? "Asia/Riyadh";

  const lines = body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const fields = line.split("\t");
    const pin = fields[0]?.trim();
    const rawTime = fields[1]?.trim();
    if (!pin || !rawTime) continue;

    try {
      await ingestPunch(device, timeZone, pin, log);
    } catch (err) {
      log.error({ err, pin, rawTime }, "Failed to record fingerprint punch");
    }
  }
}

async function ingestPunch(device: BiometricDevice, timeZone: string, pin: string, log: Logger): Promise<void> {
  const employee = await findEmployeeByPunchPin(device.orgId, pin);
  if (!employee) {
    log.warn({ pin, orgId: device.orgId }, "Fingerprint punch for an unrecognized PIN — set it as the employee's biometric PIN");
    return;
  }

  // Deliberately NOT using the terminal's own reported punch time:
  // ZKTeco's ADMS protocol has the device resync its hardware clock off
  // this server's HTTP response on every heartbeat, so its self-reported
  // clock drifts to whatever that resolves to combined with the unit's
  // own GMT offset — observed hours off from reality in practice, and not
  // fixable by hand on the keypad since the next heartbeat just resets it
  // again. Punches push in real time (Realtime=1 in our handshake reply),
  // so the server's own receipt time is the reliable value here.
  const occurredAt = new Date();

  // The terminal retries a batch until it gets "OK" back, so the same
  // punch can arrive more than once within a few seconds — this is the
  // guard against double-recording it.
  if (await recentDuplicatePunch(device.orgId, employee.id, device.id, occurredAt)) return;

  // The terminal itself doesn't reliably tell us check-in vs check-out (a
  // bare keypad F22 has no state selector) — toggle off whatever this
  // employee's last event was today, same as pairDailySessions already
  // assumes downstream.
  const last = await getLastAttendanceLog(device.orgId, employee.id);
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
    occurredAt,
  });
}

export default router;
