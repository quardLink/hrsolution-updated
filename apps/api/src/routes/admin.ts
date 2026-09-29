import { Router, type IRouter } from "express";
import { getAttendanceLogs } from "../lib/attendanceLogs";
import {
  getAllEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  hardDeleteEmployee,
  getEffectiveSchedule,
  type Employee,
  type EmployeeRole,
} from "../lib/employees";
import { getOfficeSettings, updateOfficeSettings, toPayrollPolicy } from "../lib/settings";
import { isValidDescriptor } from "../lib/faceMatch";
import {
  getAllLeaveRequests,
  addLeaveRequest,
  updateLeaveRequest,
} from "../lib/leaveRequests";
import { getAllRoles, addRole, updateRole, deleteRole } from "../lib/roles";
import {
  calculatePayrollForEmployee,
  dayOtMinutes,
  pairDailySessions,
  daysInMonth,
  type PayrollShiftConfig,
} from "../lib/payroll";
import { runDailyPayrollJob } from "../lib/payrollDailyJob";
import { requireOrgSession } from "../lib/session";
import { registerBiometricDevice, listBiometricDevices, revokeBiometricDevice, renameBiometricDevice } from "../lib/biometricDevices";
import { getOtApprovalsInRange, setOtApproval } from "../lib/otApprovals";
import { generatePairingCode, getEmployeeDevice, revokeDevice } from "../lib/devices";
import { listRemoteCheckInRequests, decideRemoteCheckInRequest } from "../lib/remoteCheckIn";
import { listGeofenceSites, addGeofenceSite, removeGeofenceSite } from "../lib/geofence";

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
          // Used for "Early Leave" status only — reportingAfternoon above
          // is the start of the afternoon session, not the end of the day.
          reportingAfternoonEnd: sched.afternoonEnd,
        };
      });

    res.json({
      logs,
      employees: employeesPublic,
      attendanceSettings: {
        lateThresholdMinutes: settings.lateThresholdMinutes,
        weeklyOffDay: settings.weeklyOffDay,
      },
    });
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

// body.faceDescriptor: a 128-d array captured client-side by face-api.js
// (enroll), or `null` to clear an existing enrollment. Anything else is
// rejected rather than silently ignored, since a malformed descriptor
// would otherwise sit in the DB and reject every future face match.
function parseFaceDescriptor(body: Record<string, unknown>): number[] | null | undefined {
  if (!("faceDescriptor" in body)) return undefined;
  const value = body.faceDescriptor;
  if (value === null) return null;
  if (!isValidDescriptor(value)) throw new Error("Invalid face descriptor");
  return value;
}

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
      faceDescriptor: parseFaceDescriptor(body) ?? null,
      biometricPin: body.biometricPin ? String(body.biometricPin).trim() : null,
      payrollMethod: body.payrollMethod === "hourly" || body.payrollMethod === "daily" ? body.payrollMethod : null,
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
    const updates: Partial<Omit<Employee, "id" | "faceEnrolled">> & { pin?: string; faceDescriptor?: number[] | null } = {};
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
    if (body.biometricPin !== undefined) {
      updates.biometricPin = body.biometricPin ? String(body.biometricPin).trim() : null;
    }
    if (body.payrollMethod !== undefined) {
      updates.payrollMethod = body.payrollMethod === "hourly" || body.payrollMethod === "daily" ? body.payrollMethod : null;
    }
    const faceDescriptor = parseFaceDescriptor(body);
    if (faceDescriptor !== undefined) updates.faceDescriptor = faceDescriptor;

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

// Permanently removes the employee row (see hardDeleteEmployee) — distinct
// from the DELETE route above, which only deactivates. Separate path
// rather than reusing the same verb, since the two have very different
// blast radii and callers should have to opt into this one explicitly.
router.delete("/admin/employees/:id/permanent", async (req, res): Promise<void> => {
  try {
    const orgId = req.orgId!;
    const id = String(req.params.id);
    const device = await getEmployeeDevice(orgId, id);
    if (device) await revokeDevice(orgId, device.id);
    await hardDeleteEmployee(orgId, id);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to permanently delete employee");
    res.status(500).json({ error: "Failed to delete employee" });
  }
});

// ============================================================
// Remote check-in device pairing (one personal phone per employee)
// ============================================================

router.post("/admin/employees/:id/pairing-code", async (req, res): Promise<void> => {
  try {
    const employees = await getAllEmployees(req.orgId!);
    const employee = employees.find((e) => e.id === req.params.id);
    if (!employee) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }
    const { code, expiresAt } = await generatePairingCode(req.orgId!, employee.name, employee.id);
    res.json({ code, expiresAt });
  } catch (err) {
    req.log.error({ err }, "Failed to generate employee pairing code");
    res.status(500).json({ error: "Failed to generate pairing code" });
  }
});

router.get("/admin/employees/:id/device", async (req, res): Promise<void> => {
  try {
    const device = await getEmployeeDevice(req.orgId!, String(req.params.id));
    res.json({
      device: device
        ? { id: device.id, pairedAt: device.pairedAt, lastSeenAt: device.lastSeenAt, userAgent: device.userAgent }
        : null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch employee device");
    res.status(500).json({ error: "Failed to fetch device" });
  }
});

router.delete("/admin/employees/:id/device", async (req, res): Promise<void> => {
  try {
    const device = await getEmployeeDevice(req.orgId!, String(req.params.id));
    if (device) await revokeDevice(req.orgId!, device.id);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to revoke employee device");
    res.status(500).json({ error: "Failed to revoke device" });
  }
});

// ============================================================
// Biometric (fingerprint terminal) devices
// ============================================================

router.get("/admin/biometric-devices", async (req, res): Promise<void> => {
  try {
    const devices = await listBiometricDevices(req.orgId!);
    res.json({ devices });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch biometric devices");
    res.status(500).json({ error: "Failed to fetch devices" });
  }
});

router.post("/admin/biometric-devices", async (req, res): Promise<void> => {
  const serialNumber = typeof req.body?.serialNumber === "string" ? req.body.serialNumber.trim() : "";
  const name = typeof req.body?.name === "string" && req.body.name.trim() ? req.body.name.trim() : "Fingerprint Terminal";
  if (!serialNumber) {
    res.status(400).json({ error: "Serial number is required" });
    return;
  }
  try {
    const device = await registerBiometricDevice(req.orgId!, serialNumber, name);
    res.json({ device });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to register device" });
  }
});

router.delete("/admin/biometric-devices/:id", async (req, res): Promise<void> => {
  try {
    await revokeBiometricDevice(req.orgId!, String(req.params.id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to revoke biometric device");
    res.status(500).json({ error: "Failed to revoke device" });
  }
});

router.patch("/admin/biometric-devices/:id", async (req, res): Promise<void> => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!name) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  try {
    await renameBiometricDevice(req.orgId!, String(req.params.id), name);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to rename biometric device");
    res.status(500).json({ error: "Failed to rename device" });
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

// "YYYY-MM-01".."YYYY-MM-<last day>" — the range otApprovals decisions are
// looked up over for a given payroll month.
function monthDateRange(year: number, month: number): [string, string] {
  const pad = (n: number) => String(n).padStart(2, "0");
  const last = daysInMonth(year, month);
  return [`${year}-${pad(month)}-01`, `${year}-${pad(month)}-${pad(last)}`];
}

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

    let approvedOtDates: Set<string> | undefined;
    if (settings.otApprovalRequired) {
      const [from, to] = monthDateRange(year, month);
      const approvals = await getOtApprovalsInRange(orgId, from, to);
      approvedOtDates = new Set(
        approvals.filter((a) => a.employeeCode === employee.id && a.status === "approved").map((a) => a.date),
      );
    }

    const result = calculatePayrollForEmployee({
      employee,
      year,
      month,
      logs,
      leaveRequests: leaveRequests.filter((r) => r.employeeId === employee.id),
      shift: {
        shiftStart: settings.payrollShiftStart,
        shiftEnd: settings.payrollShiftEnd,
        breakStart: settings.payrollBreakStart,
        breakEnd: settings.payrollBreakEnd,
      },
      policy: toPayrollPolicy(settings),
      companyMethod: settings.payrollMethod,
      otApprovalRequired: settings.otApprovalRequired,
      approvedOtDates,
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
      breakStart: settings.payrollBreakStart,
      breakEnd: settings.payrollBreakEnd,
    };

    const approvedByEmployee = new Map<string, Set<string>>();
    if (settings.otApprovalRequired) {
      const [from, to] = monthDateRange(year, month);
      const approvals = await getOtApprovalsInRange(orgId, from, to);
      for (const a of approvals) {
        if (a.status !== "approved") continue;
        if (!approvedByEmployee.has(a.employeeCode)) approvedByEmployee.set(a.employeeCode, new Set());
        approvedByEmployee.get(a.employeeCode)!.add(a.date);
      }
    }

    const policy = toPayrollPolicy(settings);
    const results = employees
      .filter((e) => e.active)
      .map((employee) =>
        calculatePayrollForEmployee({
          employee,
          year,
          month,
          logs,
          leaveRequests: leaveRequests.filter((r) => r.employeeId === employee.id),
          shift,
          policy,
          companyMethod: settings.payrollMethod,
          otApprovalRequired: settings.otApprovalRequired,
          approvedOtDates: approvedByEmployee.get(employee.id),
        }),
      );

    res.json({ results });
  } catch (err) {
    req.log.error({ err }, "Failed to calculate payroll summary");
    res.status(500).json({ error: "Failed to calculate payroll summary" });
  }
});

// ============================================================
// Overtime approvals
// ============================================================

// Every day in the month that had worked OT, cross-referenced against any
// HR decision already made — a day with OT and no row is "pending".
router.get("/admin/ot-approvals", async (req, res): Promise<void> => {
  const orgId = req.orgId!;
  const year = Number(req.query.year);
  const month = Number(req.query.month);
  if (!year || !month) {
    res.status(400).json({ error: "year and month query params are required" });
    return;
  }

  try {
    const [employees, logs, settings] = await Promise.all([
      getAllEmployees(orgId),
      getAttendanceLogs(orgId),
      getOfficeSettings(orgId),
    ]);

    const shift: PayrollShiftConfig = {
      shiftStart: settings.payrollShiftStart,
      shiftEnd: settings.payrollShiftEnd,
      breakStart: settings.payrollBreakStart,
      breakEnd: settings.payrollBreakEnd,
    };
    const policy = toPayrollPolicy(settings);

    const [from, to] = monthDateRange(year, month);
    const approvals = await getOtApprovalsInRange(orgId, from, to);
    const decisionByKey = new Map(approvals.map((a) => [`${a.employeeCode}|${a.date}`, a]));

    const items: {
      employeeId: string;
      employeeName: string;
      date: string;
      otMinutes: number;
      status: "pending" | "approved" | "rejected";
      reviewedBy: string | null;
      reviewedAt: string | null;
    }[] = [];

    for (const employee of employees) {
      if (!employee.active) continue;
      // The Daily method's own optional "weekend work" OT (see
      // calculateDailyMethodPayroll) doesn't go through this approval
      // workflow at all — it's a different concept from shift-boundary OT.
      const effectiveMethod = settings.payrollMethod === "hybrid" ? (employee.payrollMethod ?? "hourly") : settings.payrollMethod;
      if (effectiveMethod === "daily") continue;

      const days = pairDailySessions(logs, employee.id).filter((d) => d.date >= from && d.date <= to);
      for (const d of days) {
        const otMinutes = dayOtMinutes(d.checkIn, d.checkOut, shift, policy.otStartsAfterMinutes);
        if (otMinutes <= 0) continue;
        const decision = decisionByKey.get(`${employee.id}|${d.date}`);
        items.push({
          employeeId: employee.id,
          employeeName: employee.name,
          date: d.date,
          otMinutes: Math.round(otMinutes),
          status: decision?.status ?? "pending",
          reviewedBy: decision?.reviewedBy ?? null,
          reviewedAt: decision?.reviewedAt.toISOString() ?? null,
        });
      }
    }

    items.sort((a, b) => (a.date === b.date ? a.employeeName.localeCompare(b.employeeName) : a.date.localeCompare(b.date)));
    res.json({ otApprovalRequired: settings.otApprovalRequired, items });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch overtime approvals");
    res.status(500).json({ error: "Failed to fetch overtime approvals" });
  }
});

router.post("/admin/ot-approvals", async (req, res): Promise<void> => {
  const orgId = req.orgId!;
  const employeeId = typeof req.body?.employeeId === "string" ? req.body.employeeId : "";
  const date = typeof req.body?.date === "string" ? req.body.date : "";
  const status = req.body?.status === "rejected" ? "rejected" : req.body?.status === "approved" ? "approved" : null;
  if (!employeeId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !status) {
    res.status(400).json({ error: "employeeId, date (YYYY-MM-DD), and status ('approved' | 'rejected') are required" });
    return;
  }

  try {
    const [employees, logs, settings] = await Promise.all([
      getAllEmployees(orgId),
      getAttendanceLogs(orgId),
      getOfficeSettings(orgId),
    ]);
    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    const shift: PayrollShiftConfig = {
      shiftStart: settings.payrollShiftStart,
      shiftEnd: settings.payrollShiftEnd,
      breakStart: settings.payrollBreakStart,
      breakEnd: settings.payrollBreakEnd,
    };
    // Recomputed from the actual logs rather than trusting a client-supplied
    // minute count, so an approval can't be inflated by a tampered request.
    const day = pairDailySessions(logs, employee.id).find((d) => d.date === date);
    const otMinutes = day ? dayOtMinutes(day.checkIn, day.checkOut, shift, toPayrollPolicy(settings).otStartsAfterMinutes) : 0;

    const approval = await setOtApproval({
      orgId,
      employeeCode: employee.id,
      date,
      otMinutes,
      status,
      reviewedBy: typeof req.body?.reviewedBy === "string" && req.body.reviewedBy.trim() ? req.body.reviewedBy.trim() : "admin",
    });

    res.json({ approval });
  } catch (err) {
    req.log.error({ err }, "Failed to record overtime approval decision");
    res.status(500).json({ error: "Failed to record overtime approval decision" });
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

// ============================================================
// Remote check-in requests
// ============================================================

router.get("/admin/remote-requests", async (req, res): Promise<void> => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const validStatus = status === "pending" || status === "approved" || status === "rejected" || status === "expired" ? status : undefined;
    const requests = await listRemoteCheckInRequests(req.orgId!, validStatus ? { status: validStatus } : undefined);
    res.json({ requests });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch remote check-in requests");
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

router.post("/admin/remote-requests/:id/decide", async (req, res): Promise<void> => {
  const status = req.body?.status === "approved" || req.body?.status === "rejected" ? req.body.status : null;
  if (!status) {
    res.status(400).json({ error: "status must be 'approved' or 'rejected'" });
    return;
  }
  const reviewedBy = typeof req.body?.reviewedBy === "string" && req.body.reviewedBy.trim() ? req.body.reviewedBy.trim() : "admin";
  const rejectionReason = typeof req.body?.rejectionReason === "string" ? req.body.rejectionReason.trim() : undefined;

  try {
    const result = await decideRemoteCheckInRequest(req.orgId!, String(req.params.id), { status, reviewedBy, rejectionReason });
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ request: result.row });
  } catch (err) {
    req.log.error({ err }, "Failed to decide remote check-in request");
    res.status(500).json({ error: "Failed to record decision" });
  }
});

router.post("/admin/remote-requests/bulk-approve", async (req, res): Promise<void> => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((id: unknown): id is string => typeof id === "string") : [];
  if (ids.length === 0) {
    res.status(400).json({ error: "ids must be a non-empty array" });
    return;
  }
  const reviewedBy = typeof req.body?.reviewedBy === "string" && req.body.reviewedBy.trim() ? req.body.reviewedBy.trim() : "admin";

  try {
    const results = await Promise.all(
      ids.map((id: string) => decideRemoteCheckInRequest(req.orgId!, id, { status: "approved", reviewedBy })),
    );
    const approved = results.filter((r) => r.ok).length;
    const failed = results.length - approved;
    res.json({ approved, failed });
  } catch (err) {
    req.log.error({ err }, "Failed to bulk-approve remote check-in requests");
    res.status(500).json({ error: "Failed to bulk-approve requests" });
  }
});

// ============================================================
// Geofence sites (used by remote check-in auto-approval)
// ============================================================

router.get("/admin/geofence-sites", async (req, res): Promise<void> => {
  try {
    const sites = await listGeofenceSites(req.orgId!);
    res.json({ sites });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch geofence sites");
    res.status(500).json({ error: "Failed to fetch sites" });
  }
});

router.post("/admin/geofence-sites", async (req, res): Promise<void> => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const latitude = Number(req.body?.latitude);
  const longitude = Number(req.body?.longitude);
  const radiusMeters = Number(req.body?.radiusMeters) || 200;
  if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    res.status(400).json({ error: "name, latitude, and longitude are required" });
    return;
  }
  try {
    const site = await addGeofenceSite(req.orgId!, { name, latitude, longitude, radiusMeters });
    res.json({ site });
  } catch (err) {
    req.log.error({ err }, "Failed to add geofence site");
    res.status(500).json({ error: "Failed to add site" });
  }
});

router.delete("/admin/geofence-sites/:id", async (req, res): Promise<void> => {
  try {
    await removeGeofenceSite(req.orgId!, String(req.params.id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to remove geofence site");
    res.status(500).json({ error: "Failed to remove site" });
  }
});

export default router;
