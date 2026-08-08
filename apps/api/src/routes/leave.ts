import { Router, type IRouter } from "express";
import { getAllEmployees, verifyEmployee, getPublicEmployees } from "../lib/employees";
import { getOfficeSettings } from "../lib/settings";
import { addLeaveRequest } from "../lib/leaveRequests";

const router: IRouter = Router();

/**
 * Public-facing routes for employees to file their own leave requests
 * without admin credentials. Identity is verified by employee PIN.
 */

router.get("/leave/employees", async (_req, res): Promise<void> => {
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
    // Only return id+name (no schedule data needed for the leave form)
    res.json({ employees: employees.map((e) => ({ id: e.id, name: e.name })) });
  } catch {
    res.status(500).json({ error: "Failed to load employees" });
  }
});

router.post("/leave/requests", async (req, res): Promise<void> => {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    res.status(500).json({ error: "Google Sheets not configured" });
    return;
  }

  const body = req.body ?? {};
  const { employeeId, pin, fromDate, toDate, type, reason } = body;

  if (!employeeId || !pin || !fromDate || !toDate) {
    res.status(400).json({ error: "employeeId, pin, fromDate and toDate are required" });
    return;
  }
  if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
    res.status(400).json({ error: "PIN must be 4 digits" });
    return;
  }

  try {
    const employee = await verifyEmployee(sheetId, String(employeeId), pin);
    if (!employee) {
      res.status(401).json({ error: "Invalid employee or PIN" });
      return;
    }
    if (String(toDate) < String(fromDate)) {
      res.status(400).json({ error: "End date cannot be before start date" });
      return;
    }
    const created = await addLeaveRequest(sheetId, {
      employeeId: employee.id,
      employeeName: employee.name,
      fromDate: String(fromDate),
      toDate: String(toDate),
      type: (type ?? "annual"),
      reason: String(reason ?? ""),
    });
    // Avoid leaking employee data — return minimal confirmation
    res.json({
      success: true,
      request: {
        id: created.id,
        employeeName: created.employeeName,
        fromDate: created.fromDate,
        toDate: created.toDate,
        type: created.type,
        status: created.status,
      },
    });
  } catch (err) {
    void getAllEmployees; // silence unused import if removed later
    req.log.error({ err }, "Failed to create public leave request");
    res.status(500).json({ error: "Failed to submit leave request" });
  }
});

export default router;
