import { Router, type IRouter } from "express";
import { getAttendanceLogs } from "../lib/attendanceLogs";
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
import { calculateMonthlyPayroll } from "../lib/payroll";
import { runDailyPayrollJob } from "../lib/payrollDailyJob";
import { requireOrgSession } from "../lib/session";

const router: IRouter = Router();
router.use(requireOrgSession);

// ============================================================
// Logs
// ============================================================

router.get("/admin/logs", async (req, res): Promise<void> => {
  const orgId = req.orgId!;
  try {
    const [logs, employees, settings] = await Promise.all([
      getAttendanceLogs(orgId),
      getAllEmployees(orgId),
      getOfficeSettings(orgId),
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

router.get("/admin/employees", async (req, res): Promise<void> => {
  try {
    const employees = await getAllEmployees(req.orgId!);
    res.json({ employees });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch employees");
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});

router.post("/admin/employees", async (req, res): Promise<void> => {
  try {
    const body = req.body ?? {};
    if (!body.name || !body.pin) {
      res.status(400).json({ error: "Name and PIN are required" });
      return;
    }
    const created = await addEmployee(req.orgId!, {
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

router.patch("/admin/employees/:id", async (req, res): Promise<void> => {
  try {
    const body = req.body ?? {};
    const updates: Partial<Omit<Employee, "id">> & { pin?: string } = {};
    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.pin) updates.pin = String(body.pin).trim();
    if (body.role !== undefined) updates.role = body.role as EmployeeRole;
    if (body.active !== undefined) updates.active = !!body.active;
    if (body.useCustomSchedule !== undefined) updates.useCustomSchedule = !!body.useCustomSchedule;
    if (body.morningStart !== undefined) updates.morningStart = String(body.morningStart);
    if (body.morningEnd !== undefined) updates.morningEnd = String(body.morningEnd);
    if (body.afternoonStart !== undefined) updates.afternoonStart = String(body.afternoonStart);
    if (body.afternoonEnd !== undefined) updates.afternoonEnd = String(body.afternoonEnd);
    if (body.monthlySalary !== undefined) updates.monthlySalary = Number(body.monthlySalary) || 0;

    const updated = await updateEmployee(req.orgId!, String(req.params.id), updates);
    res.json({ employee: updated });
  } catch (err) {
    req.log.error({ err }, "Failed to update employee");
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to update employee" });
  }
});

router.delete("/admin/employees/:id", async (req, res): Promise<void> => {
  try {
    await deleteEmployee(req.orgId!, String(req.params.id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete employee");
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to delete employee" });
  }
});

// ============================================================
// Settings
// ============================================================

router.get("/admin/settings", async (req, res): Promise<void> => {
  try {
    const settings = await getOfficeSettings(req.orgId!);
    res.json({ settings });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch settings");
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

router.patch("/admin/settings", async (req, res): Promise<void> => {
  try {
    const updated = await updateOfficeSettings(req.orgId!, req.body ?? {});
    res.json({ settings: updated });
  } catch (err) {
    req.log.error({ err }, "Failed to update settings");
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// ============================================================
// Roles CRUD
// ============================================================

router.get("/admin/roles", async (req, res): Promise<void> => {
  try {
    const roles = await getAllRoles(req.orgId!);
    res.json({ roles });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch roles");
    res.status(500).json({ error: "Failed to fetch roles" });
  }
});

router.post("/admin/roles", async (req, res): Promise<void> => {
  const { value, label } = req.body ?? {};
  if (!value || !label) {
    res.status(400).json({ error: "value and label are required" });
    return;
  }
  try {
    const role = await addRole(req.orgId!, { value: String(value), label: String(label) });
    res.json({ role });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to add role" });
  }
});

router.patch("/admin/roles/:value", async (req, res): Promise<void> => {
  try {
    const role = await updateRole(req.orgId!, String(req.params.value), req.body ?? {});
    res.json({ role });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to update role" });
  }
});

router.delete("/admin/roles/:value", async (req, res): Promise<void> => {
  try {
    await deleteRole(req.orgId!, String(req.params.value));
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to delete role" });
  }
});

// ============================================================
// Leave Requests (admin)
// ============================================================

router.get("/admin/leave-requests", async (req, res): Promise<void> => {
  try {
    const requests = await getAllLeaveRequests(req.orgId!);
    res.json({ requests });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch leave requests");
    res.status(500).json({ error: "Failed to fetch leave requests" });
  }
});

router.post("/admin/leave-requests", async (req, res): Promise<void> => {
  try {
    const body = req.body ?? {};
    if (!body.employeeId || !body.fromDate || !body.toDate) {
      res.status(400).json({ error: "employeeId, fromDate, and toDate are required" });
      return;
    }
    const employees = await getAllEmployees(req.orgId!);
    const emp = employees.find((e) => e.id === body.employeeId);
    if (!emp) {
      res.status(400).json({ error: "Unknown employeeId" });
      return;
    }
    const created = await addLeaveRequest(req.orgId!, {
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

router.patch("/admin/leave-requests/:id", async (req, res): Promise<void> => {
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
    const updated = await updateLeaveRequest(req.orgId!, String(req.params.id), updates);
    res.json({ request: updated });
  } catch (err) {
    req.log.error({ err }, "Failed to update leave request");
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to update leave request" });
  }
});

// ============================================================
// Payroll
// ============================================================

router.get("/admin/payroll/:employeeId", async (req, res): Promise<void> => {
  const orgId = req.orgId!;
  const year = Number(req.query.year);
  const month = Number(req.query.month); // 1-12
  if (!year || !month) {
    res.status(400).json({ error: "year and month query params are required" });
    return;
  }

  try {
    const [employees, logs, leaveRequests, settings] = await Promise.all([
      getAllEmployees(orgId),
      getAttendanceLogs(orgId),
      getAllLeaveRequests(orgId),
      getOfficeSettings(orgId),
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
      shift: {
        shiftStart: settings.payrollShiftStart,
        shiftEnd: settings.payrollShiftEnd,
        breakMinutes: Number(settings.payrollBreakMinutes) || 0,
      },
    });

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to calculate payroll");
    res.status(500).json({ error: "Failed to calculate payroll" });
  }
});

router.get("/admin/payroll-summary", async (req, res): Promise<void> => {
  const orgId = req.orgId!;
  const year = Number(req.query.year);
  const month = Number(req.query.month);
  if (!year || !month) {
    res.status(400).json({ error: "year and month query params are required" });
    return;
  }

  try {
    const [employees, logs, leaveRequests, settings] = await Promise.all([
      getAllEmployees(orgId),
      getAttendanceLogs(orgId),
      getAllLeaveRequests(orgId),
      getOfficeSettings(orgId),
    ]);

    const shift = {
      shiftStart: settings.payrollShiftStart,
      shiftEnd: settings.payrollShiftEnd,
      breakMinutes: Number(settings.payrollBreakMinutes) || 0,
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
          shift,
        }),
      );

    res.json({ results });
  } catch (err) {
    req.log.error({ err }, "Failed to calculate payroll summary");
    res.status(500).json({ error: "Failed to calculate payroll summary" });
  }
});

router.post("/admin/payroll/run-daily", async (req, res): Promise<void> => {
  const dateOverride = typeof req.body?.date === "string" ? req.body.date : undefined;
  if (dateOverride && !/^\d{4}-\d{2}-\d{2}$/.test(dateOverride)) {
    res.status(400).json({ error: "date must be in YYYY-MM-DD format" });
    return;
  }

  try {
    await runDailyPayrollJob(req.orgId!, dateOverride);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to run daily payroll job");
    res.status(500).json({ error: "Failed to run daily payroll job" });
  }
});

export default router;
