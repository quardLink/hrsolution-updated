import { Router, type IRouter } from "express";
import { verifyEmployee, getPublicEmployees } from "../lib/employees";
import { getOfficeSettings } from "../lib/settings";
import { addLeaveRequest } from "../lib/leaveRequests";
import { getOrgBySlug } from "../lib/orgs";

const router: IRouter = Router();

/**
 * Public-facing routes for employees to file their own leave requests
 * from anywhere (not device-locked, unlike attendance) without admin
 * credentials. Identity is verified by employee PIN; the firm is
 * identified by its slug, shared as part of the public link.
 */

router.get("/leave/employees", async (req, res): Promise<void> => {
  const orgSlug = typeof req.query.org === "string" ? req.query.org : "";
  const org = orgSlug ? await getOrgBySlug(orgSlug) : null;
  if (!org) {
    res.status(404).json({ error: "Firm not found" });
    return;
  }
  try {
    const settings = await getOfficeSettings(org.id);
    const employees = await getPublicEmployees(org.id, {
      morningStart: settings.defaultMorningStart,
      morningEnd: settings.defaultMorningEnd,
      afternoonStart: settings.defaultAfternoonStart,
      afternoonEnd: settings.defaultAfternoonEnd,
    });
    // Only return id+name (no schedule data needed for the leave form)
    res.json({ employees: employees.map((e) => ({ id: e.id, name: e.name })), orgName: org.name });
  } catch {
    res.status(500).json({ error: "Failed to load employees" });
  }
});

router.post("/leave/requests", async (req, res): Promise<void> => {
  const body = req.body ?? {};
  const { orgSlug, employeeId, pin, fromDate, toDate, type, reason } = body;

  const org = typeof orgSlug === "string" ? await getOrgBySlug(orgSlug) : null;
  if (!org) {
    res.status(404).json({ error: "Firm not found" });
    return;
  }

  if (!employeeId || !pin || !fromDate || !toDate) {
    res.status(400).json({ error: "employeeId, pin, fromDate and toDate are required" });
    return;
  }
  if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
    res.status(400).json({ error: "PIN must be 4 digits" });
    return;
  }

  try {
    const employee = await verifyEmployee(org.id, String(employeeId), pin);
    if (!employee) {
      res.status(401).json({ error: "Invalid employee or PIN" });
      return;
    }
    if (String(toDate) < String(fromDate)) {
      res.status(400).json({ error: "End date cannot be before start date" });
      return;
    }
    const created = await addLeaveRequest(org.id, {
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
    req.log.error({ err }, "Failed to create public leave request");
    res.status(500).json({ error: "Failed to submit leave request" });
  }
});

export default router;
