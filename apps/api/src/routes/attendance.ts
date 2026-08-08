import { Router, type IRouter } from "express";
import { getPublicEmployees, verifyEmployee, getAttendanceStatus } from "../lib/employees";
import { getOfficeSettings } from "../lib/settings";
import { appendAttendanceRow, ensureSheetHeaders } from "../lib/googleSheets";
import { LogAttendanceBody } from "@workspace/api-schema";

const router: IRouter = Router();

router.get("/attendance/employees", async (_req, res): Promise<void> => {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    res.status(500).json({ error: "Google Sheets not configured" });
    return;
  }
  try {
    const settings = await getOfficeSettings(sheetId);
    const employees = await getPublicEmployees(sheetId, {
      morningStart: settings.defaultMorningStart,
      morningEnd: settings.defaultMorningEnd,
      afternoonStart: settings.defaultAfternoonStart,
      afternoonEnd: settings.defaultAfternoonEnd,
    });
    res.json(employees);
  } catch (err) {
    _req.log.error({ err }, "Failed to load employees");
    res.status(500).json({ error: "Failed to load employees" });
  }
});

router.post("/attendance/log", async (req, res): Promise<void> => {
  const parsed = LogAttendanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { employeeId, pin, action, session } = parsed.data;

  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    res.status(500).json({ error: "Google Sheets not configured" });
    return;
  }

  const employee = await verifyEmployee(sheetId, employeeId, pin);
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

  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    try {
      await ensureSheetHeaders(sheetId);
      await appendAttendanceRow({
        sheetId,
        employeeName: employee.name,
        employeeId: employee.id,
        action,
        session,
        timestamp,
        status,
        message,
      });
    } catch (err) {
      req.log.error({ err }, "Failed to write to Google Sheets");
    }
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
