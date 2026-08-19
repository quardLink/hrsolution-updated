// Midnight job: writes one payroll row per active employee for a single day
// — a durable daily audit trail, distinct from the on-demand monthly
// summary in the admin Payroll tab. Never throws: a DB hiccup at midnight
// must not crash the server or the cron loop.

import { getAttendanceLogs } from "./attendanceLogs";
import { getAllEmployees } from "./employees";
import { getOfficeSettings } from "./settings";
import { calculateDailyPayroll, type PayrollShiftConfig } from "./payroll";
import { recordDailyPayrollEntry } from "./payrollDailyEntries";
import { logger } from "./logger";

function yesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function runDailyPayrollJob(orgId: string, dateOverride?: string): Promise<void> {
  const date = dateOverride ?? yesterdayDateString();

  try {
    const [employees, logs, settings] = await Promise.all([
      getAllEmployees(orgId),
      getAttendanceLogs(orgId),
      getOfficeSettings(orgId),
    ]);

    const shift: PayrollShiftConfig = {
      shiftStart: settings.payrollShiftStart,
      shiftEnd: settings.payrollShiftEnd,
      breakMinutes: Number(settings.payrollBreakMinutes) || 0,
    };

    const activeEmployees = employees.filter((e) => e.active);
    let written = 0;

    for (const employee of activeEmployees) {
      try {
        const result = calculateDailyPayroll({ employee, date, logs, shift });
        await recordDailyPayrollEntry(orgId, result);
        written++;
      } catch (err) {
        logger.error(
          { err, orgId, employeeId: employee.id, date },
          "Failed to compute/write daily payroll row for employee",
        );
      }
    }

    logger.info({ orgId, date, employeeCount: activeEmployees.length, written }, "Daily payroll job completed");
  } catch (err) {
    logger.error({ err, orgId, date }, "Daily payroll job failed");
  }
}
