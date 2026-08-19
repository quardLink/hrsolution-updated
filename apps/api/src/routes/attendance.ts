import { Router, type IRouter } from "express";
import { getPublicEmployees, verifyEmployee, getAttendanceStatus } from "../lib/employees";
import { getOfficeSettings } from "../lib/settings";
import { appendAttendanceRow } from "../lib/attendanceLogs";
import { getOrgById } from "../lib/orgs";
import { requireDeviceToken } from "../lib/devices";
import { LogAttendanceBody } from "@workspace/api-schema";

const router: IRouter = Router();

// Every route below requires a valid, unrevoked device token — this is
// what makes attendance impossible to fake from outside the paired kiosk.
// A device token only exists after an admin generates a pairing code in
// Settings and someone standing at the physical machine redeems it.
//
// Applied per-route (not via a blanket router.use()) — this router is
// mounted with no path prefix in routes/index.ts (matching every other
// router in this app), so an unconditional router.use() here would run
// for every request that reaches this router in the middleware chain,
// including ones headed for /api/admin/* or /api/leave/* routes mounted
// after it.

router.get("/attendance/org-info", requireDeviceToken, async (req, res): Promise<void> => {
  const org = await getOrgById(req.orgId!);
  if (!org) {
    res.status(404).json({ error: "Firm not found" });
    return;
  }
  res.json({ name: org.name, logoDataUrl: org.logoDataUrl });
});

router.get("/attendance/employees", requireDeviceToken, async (req, res): Promise<void> => {
  try {
    const settings = await getOfficeSettings(req.orgId!);
    const employees = await getPublicEmployees(req.orgId!, {
      morningStart: settings.defaultMorningStart,
      morningEnd: settings.defaultMorningEnd,
      afternoonStart: settings.defaultAfternoonStart,
      afternoonEnd: settings.defaultAfternoonEnd,
    });
    res.json(employees);
  } catch (err) {
    req.log.error({ err }, "Failed to load employees");
    res.status(500).json({ error: "Failed to load employees" });
  }
});

router.post("/attendance/log", requireDeviceToken, async (req, res): Promise<void> => {
  const parsed = LogAttendanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { employeeId, pin, action, session } = parsed.data;
  const orgId = req.orgId!;

  const employee = await verifyEmployee(orgId, employeeId, pin);
  if (!employee) {
    res.status(400).json({ error: "Invalid employee or PIN. Please try again." });
    return;
  }

  const TIMEZONE = "Asia/Riyadh";
  const now = new Date();

  const localTimeStr = now.toLocaleString("en-US", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const [localHour, localMin] = localTimeStr.split(":").map(Number);
  const saudiNow = new Date(now);
  saudiNow.setHours(localHour, localMin, 0, 0);

  const { status, message } = getAttendanceStatus(
    employee,
    action as "checkin" | "checkout",
    session as "morning" | "afternoon_out" | "afternoon_in" | "evening",
    saudiNow,
  );

  const timestamp = now.toLocaleString("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  try {
    await appendAttendanceRow({
      orgId,
      employeeName: employee.name,
      employeeId: employee.id,
      action,
      session,
      timestamp,
      status,
      message,
      deviceId: req.deviceId,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to write attendance log");
  }

  res.json({
    success: true,
    message,
    status,
    employeeName: employee.name,
    timestamp,
  });
});

export default router;
