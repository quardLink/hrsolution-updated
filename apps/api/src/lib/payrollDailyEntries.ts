import { getDb, schema } from "../db/client";
import type { DailyPayrollResult } from "./payroll";

// Durable per-day audit trail written by the midnight cron job — distinct
// from the on-demand monthly summary in the admin Payroll tab.
export async function recordDailyPayrollEntry(
  orgId: string,
  result: DailyPayrollResult,
): Promise<void> {
  const db = getDb();
  await db.insert(schema.payrollDailyEntries).values({
    orgId,
    date: result.date,
    employeeCode: result.employeeId,
    employeeName: result.employeeName,
    checkIn: result.checkIn,
    checkOut: result.checkOut,
    workedHours: String(result.workedHours),
    otHours: String(result.otHours),
    dailyRate: String(result.dailyRate),
    hourlyRate: String(result.hourlyRate),
    otPay: String(result.otPay),
  });
}
