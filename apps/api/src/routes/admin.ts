import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { getAttendanceLogs } from "../lib/googleSheets";
import {
  getAllEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  getEffectiveSchedule,
  type Employee,
  type EmployeeRole,
} from "../lib/employees";
import { getOfficeSettings, updateOfficeSettings } from "../lib/settings";
import {
  getAllLeaveRequests,
  addLeaveRequest,
  updateLeaveRequest,
} from "../lib/leaveRequests";
import { getAllRoles, addRole, updateRole, deleteRole } from "../lib/roles";
import { verifyAdminPassword, setAdminPassword } from "../lib/adminPassword";
import { calculateMonthlyPayroll } from "../lib/payroll";

const router: IRouter = Router();

async function checkAdminAuth(req: Request): Promise<boolean> {
  const provided = req.headers["x-admin-password"];
  const passwordValue = Array.isArray(provided) ? provided[0] : provided;
  if (!passwordValue || typeof passwordValue !== "string") return false;
  return verifyAdminPassword(process.env.GOOGLE_SHEET_ID, passwordValue);
}

async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const ok = await checkAdminAuth(req);
  if (!ok) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

function requireSheetId(res: Response): string | null {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    res.status(500).json({ error: "Google Sheets not configured" });
    return null;
  }
  return sheetId;
}

// ============================================================
// Auth
// ============================================================

router.post("/admin/login", async (req, res): Promise<void> => {
  const { password } = req.body ?? {};
  if (typeof password !== "string") {
    res.status(400).json({ error: "Password required" });
    return;
  }
  const ok = await verifyAdminPassword(process.env.GOOGLE_SHEET_ID, password);
  if (!ok) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }
  res.json({ success: true });
});

router.patch("/admin/password", requireAdmin, async (req, res): Promise<void> => {
  const sheetId = requireSheetId(res);
  if (!sheetId) return;
  const { oldPassword, newPassword } = req.body ?? {};
  if (typeof oldPassword !== "string" || typeof newPassword !== "string") {
    res.status(400).json({ error: "oldPassword and newPassword are required" });
    return;
  }
  try {
    await setAdminPassword(sheetId, oldPassword, newPassword);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to change password" });
  }
});

// ============================================================
// Logs
// ============================================================

router.get("/admin/logs", requireAdmin, async (req, res): Promise<void> => {
  const sheetId = requireSheetId(res);
  if (!sheetId) return;

  try {
    const [logs, employees, settings] = await Promise.all([
      getAttendanceLogs(sheetId),
      getAllEmployees(sheetId),
      getOfficeSettings(sheetId),
    ]);

    const defaults = {
      morningStart: settings.defaultMorningStart,
      morningEnd: settings.defaultMorningEnd,
      afternoonStart: settings.defaultAfternoonStart,
      afternoonEnd: settings.defaultAfternoonEnd,
    };

    // Public employee shape with effective schedule
    const employeesPublic = employees
      .filter((e) => e.active)
      .map((e) => {
        const sched = getEffectiveSchedule(e, defaults);
        return {
          id: e.id,
          name: e.name,
          role: e.role,
          reportingMorning: sched.morningStart,
          reportingAfternoon: sched.afternoonStart,
        };
      });

    res.json({ logs, employees: employeesPublic });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch attendance logs");
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

// ============================================================
// Employees CRUD
// ============================================================

router.get("/admin/employees", requireAdmin, async (req, res): Promise<void> => {
  const sheetId = requireSheetId(res);
  if (!sheetId) return;
  try {
    const employees = await getAllEmployees(sheetId);
    res.json({ employees });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch employees");
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});

router.post("/admin/employees", requireAdmin, async (req, res): Promise<void> => {
  const sheetId = requireSheetId(res);
  if (!sheetId) return;
  try {
    const body = req.body ?? {};
    if (!body.name || !body.pin) {
      res.status(400).json({ error: "Name and PIN are required" });
      return;
    }
    const created = await addEmployee(sheetId, {
      id: body.id,
      name: String(body.name).trim(),
      pin: String(body.pin).trim(),
      role: (body.role ?? "other") as EmployeeRole,
      active: body.active !== false,
      useCustomSchedule: body.useCustomSchedule === true,
      morningStart: body.morningStart ?? "08:00",
      morningEnd: body.morningEnd ?? "13:30",
      afternoonStart: body.afternoonStart ?? "16:00",
      afternoonEnd: body.afternoonEnd ?? "19:00",
      monthlySalary: Number(body.monthlySalary) || 0,
    });
    res.json({ employee: created });
  } catch (err) {
    req.log.error({ err }, "Failed to add employee");
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to add employee" });
  }
});

router.patch("/admin/employees/:id", requireAdmin, async (req, res): Promise<void> => {
  const sheetId = requireSheetId(res);
  if (!sheetId) return;
  try {
    const body = req.body ?? {};
    const updates: Partial<Omit<Employee, "id">> = {};
    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.pin !== undefined) updates.pin = String(body.pin).trim();
    if (body.role !== undefined) updates.role = body.role as EmployeeRole;
    if (body.active !== undefined) updates.active = !!body.active;
    if (body.useCustomSchedule !== undefined) updates.useCustomSchedule = !!body.useCustomSchedule;
    if (body.morningStart !== undefined) updates.morningStart = String(body.morningStart);
    if (body.morningEnd !== undefined) updates.morningEnd = String(body.morningEnd);
    if (body.afternoonStart !== undefined) updates.afternoonStart = String(body.afternoonStart);
    if (body.afternoonEnd !== undefined) updates.afternoonEnd = String(body.afternoonEnd);
    if (body.monthlySalary !== undefined) updates.monthlySalary = Number(body.monthlySalary) || 0;

    const updated = await updateEmployee(sheetId, String(req.params.id), updates);
    res.json({ employee: updated });
  } catch (err) {
    req.log.error({ err }, "Failed to update employee");
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to update employee" });
  }
});

router.delete("/admin/employees/:id", requireAdmin, async (req, res): Promise<void> => {
  const sheetId = requireSheetId(res);
  if (!sheetId) return;
  try {
    await deleteEmployee(sheetId, String(req.params.id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete employee");
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to delete employee" });
  }
});

// ============================================================
// Settings
// ============================================================

router.get("/admin/settings", requireAdmin, async (req, res): Promise<void> => {
  const sheetId = requireSheetId(res);
  if (!sheetId) return;
  try {
    const settings = await getOfficeSettings(sheetId);
    // Don't leak the password hash to the client
    const { adminPasswordHash, ...safe } = settings;
    void adminPasswordHash;
    res.json({ settings: { ...safe, hasCustomAdminPassword: !!adminPasswordHash } });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch settings");
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

router.patch("/admin/settings", requireAdmin, async (req, res): Promise<void> => {
  const sheetId = requireSheetId(res);
  if (!sheetId) return;
  try {
    // Strip protected fields — password updates go through /admin/password
    const body = { ...(req.body ?? {}) };
    delete body.adminPasswordHash;
    delete body.hasCustomAdminPassword;
    const updated = await updateOfficeSettings(sheetId, body);
    const { adminPasswordHash, ...safe } = updated;
    res.json({ settings: { ...safe, hasCustomAdminPassword: !!adminPasswordHash } });
  } catch (err) {
    req.log.error({ err }, "Failed to update settings");
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// ============================================================
// Roles CRUD
// ============================================================

router.get("/admin/roles", requireAdmin, async (req, res): Promise<void> => {
  const sheetId = requireSheetId(res);
  if (!sheetId) return;
  try {
    const roles = await getAllRoles(sheetId);
    res.json({ roles });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch roles");
    res.status(500).json({ error: "Failed to fetch roles" });
  }
});

router.post("/admin/roles", requireAdmin, async (req, res): Promise<void> => {
  const sheetId = requireSheetId(res);
  if (!sheetId) return;
  const { value, label } = req.body ?? {};
  if (!value || !label) {
    res.status(400).json({ error: "value and label are required" });
    return;
  }
  try {
    const role = await addRole(sheetId, { value: String(value), label: String(label) });
    res.json({ role });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to add role" });
  }
});

router.patch("/admin/roles/:value", requireAdmin, async (req, res): Promise<void> => {
  const sheetId = requireSheetId(res);
  if (!sheetId) return;
  try {
    const role = await updateRole(sheetId, String(req.params.value), req.body ?? {});
    res.json({ role });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to update role" });
  }
});

router.delete("/admin/roles/:value", requireAdmin, async (req, res): Promise<void> => {
  const sheetId = requireSheetId(res);
  if (!sheetId) return;
  try {
    await deleteRole(sheetId, String(req.params.value));
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to delete role" });
  }
});

// ============================================================
// Leave Requests (admin)
// ============================================================

router.get("/admin/leave-requests", requireAdmin, async (req, res): Promise<void> => {
  const sheetId = requireSheetId(res);
  if (!sheetId) return;
  try {
    const requests = await getAllLeaveRequests(sheetId);
    res.json({ requests });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch leave requests");
    res.status(500).json({ error: "Failed to fetch leave requests" });
  }
});

router.post("/admin/leave-requests", requireAdmin, async (req, res): Promise<void> => {
  const sheetId = requireSheetId(res);
  if (!sheetId) return;
  try {
    const body = req.body ?? {};
    if (!body.employeeId || !body.fromDate || !body.toDate) {
      res.status(400).json({ error: "employeeId, fromDate, and toDate are required" });
      return;
    }
    const employees = await getAllEmployees(sheetId);
    const emp = employees.find((e) => e.id === body.employeeId);
    if (!emp) {
      res.status(400).json({ error: "Unknown employeeId" });
      return;
    }
    const created = await addLeaveRequest(sheetId, {
      employeeId: body.employeeId,
      employeeName: emp.name,
      fromDate: body.fromDate,
      toDate: body.toDate,
      type: body.type ?? "annual",
      reason: body.reason ?? "",
    });
    res.json({ request: created });
  } catch (err) {
    req.log.error({ err }, "Failed to create leave request");
    res.status(500).json({ error: "Failed to create leave request" });
  }
});

router.patch("/admin/leave-requests/:id", requireAdmin, async (req, res): Promise<void> => {
  const sheetId = requireSheetId(res);
  if (!sheetId) return;
  try {
    const body = req.body ?? {};
    const updates: Record<string, string> = {};
    if (body.status) {
      updates.status = body.status;
      updates.reviewedAt = new Date().toISOString();
      updates.reviewedBy = body.reviewedBy ?? "admin";
    }
    if (body.reason !== undefined) updates.reason = body.reason;
    if (body.fromDate !== undefined) updates.fromDate = body.fromDate;
    if (body.toDate !== undefined) updates.toDate = body.toDate;
    if (body.type !== undefined) updates.type = body.type;
    const updated = await updateLeaveRequest(sheetId, String(req.params.id), updates);
    res.json({ request: updated });
  } catch (err) {
    req.log.error({ err }, "Failed to update leave request");
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to update leave request" });
  }
});

// ============================================================
// Payroll
// ============================================================

router.get("/admin/payroll/:employeeId", requireAdmin, async (req, res): Promise<void> => {
  const sheetId = requireSheetId(res);
  if (!sheetId) return;

  const year = Number(req.query.year);
  const month = Number(req.query.month); // 1-12
  if (!year || !month) {
    res.status(400).json({ error: "year and month query params are required" });
    return;
  }

  try {
    const [employees, logs, leaveRequests, settings] = await Promise.all([
      getAllEmployees(sheetId),
      getAttendanceLogs(sheetId),
      getAllLeaveRequests(sheetId),
      getOfficeSettings(sheetId),
    ]);

    const employee = employees.find((e) => e.id === req.params.employeeId);
    if (!employee) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    const result = calculateMonthlyPayroll({
      employee,
      year,
      month,
      logs,
      leaveRequests: leaveRequests.filter((r) => r.employeeId === employee.id),
      weeklyOffDay: settings.weeklyOffDay,
      officeDefaults: {
        morningStart: settings.defaultMorningStart,
        morningEnd: settings.defaultMorningEnd,
        afternoonStart: settings.defaultAfternoonStart,
        afternoonEnd: settings.defaultAfternoonEnd,
      },
    });

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to calculate payroll");
    res.status(500).json({ error: "Failed to calculate payroll" });
  }
});

router.get("/admin/payroll-summary", requireAdmin, async (req, res): Promise<void> => {
  const sheetId = requireSheetId(res);
  if (!sheetId) return;

  const year = Number(req.query.year);
  const month = Number(req.query.month);
  if (!year || !month) {
    res.status(400).json({ error: "year and month query params are required" });
    return;
  }

  try {
    const [employees, logs, leaveRequests, settings] = await Promise.all([
      getAllEmployees(sheetId),
      getAttendanceLogs(sheetId),
      getAllLeaveRequests(sheetId),
      getOfficeSettings(sheetId),
    ]);

    const officeDefaults = {
      morningStart: settings.defaultMorningStart,
      morningEnd: settings.defaultMorningEnd,
      afternoonStart: settings.defaultAfternoonStart,
      afternoonEnd: settings.defaultAfternoonEnd,
    };

    const results = employees
      .filter((e) => e.active)
      .map((employee) =>
        calculateMonthlyPayroll({
          employee,
          year,
          month,
          logs,
          leaveRequests: leaveRequests.filter((r) => r.employeeId === employee.id),
          weeklyOffDay: settings.weeklyOffDay,
          officeDefaults,
        }),
      );

    res.json({ results });
  } catch (err) {
    req.log.error({ err }, "Failed to calculate payroll summary");
    res.status(500).json({ error: "Failed to calculate payroll summary" });
  }
});

export default router;
