// Midnight job: writes one payroll row per active employee for a single day
// to the Payroll sheet — a durable daily audit trail, distinct from the
// on-demand monthly summary in the admin Payroll tab. Never throws: a
// Sheets API hiccup at midnight must not crash the server or the cron loop.

import { ensureSheet, appendSheetRow, getAttendanceLogs } from "./googleSheets";
import { getAllEmployees } from "./employees";
import { getOfficeSettings } from "./settings";
import { calculateDailyPayroll, type PayrollShiftConfig } from "./payroll";
import { logger } from "./logger";

const SHEET_NAME = "Payroll";
const HEADERS = [
  "Date",
  "Employee ID",
  "Employee Name",
  "Check In",
  "Check Out",
  "Worked Hours",
  "OT Hours",
  "Daily Rate",
  "Hourly Rate",
  "OT Pay",
];
const NUM_COLS = HEADERS.length;

function yesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function runDailyPayrollJob(sheetId: string, dateOverride?: string): Promise<void> {
  const date = dateOverride ?? yesterdayDateString();

  try {
    await ensureSheet(sheetId, SHEET_NAME, HEADERS);

    const [employees, logs, settings] = await Promise.all([
      getAllEmployees(sheetId),
      getAttendanceLogs(sheetId),
      getOfficeSettings(sheetId),
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
        await appendSheetRow(sheetId, SHEET_NAME, NUM_COLS, [
          result.date,
          result.employeeId,
          result.employeeName,
          result.checkIn ?? "",
          result.checkOut ?? "",
          result.workedHours,
          result.otHours,
          result.dailyRate,
          result.hourlyRate,
          result.otPay,
        ]);
        written++;
      } catch (err) {
        logger.error(
          { err, employeeId: employee.id, date },
          "Failed to compute/write daily payroll row for employee",
        );
      }
    }

    logger.info({ date, employeeCount: activeEmployees.length, written }, "Daily payroll job completed");
  } catch (err) {
    logger.error({ err, date }, "Daily payroll job failed");
  }
}
