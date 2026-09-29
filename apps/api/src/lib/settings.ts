import { and, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "../db/client";
import type { PayrollPolicy } from "./payroll";

export interface OfficeSettings {
  defaultMorningStart: string;
  defaultMorningEnd: string;
  defaultAfternoonStart: string;
  defaultAfternoonEnd: string;
  lunchBreakEnd: string;
  lateThresholdMinutes: string;
  weeklyOffDay: string; // e.g. "Friday" — informational only; payroll treats every day identically
  // Payroll-specific — a single company-wide shift with a floating break,
  // kept separate from the default* fields above (those still drive the
  // kiosk's late-arrival messages, a different concern).
  payrollShiftStart: string;
  payrollShiftEnd: string;
  payrollBreakStart: string;
  payrollBreakEnd: string;
  // When true, a day's overtime is only paid once HR approves it (see
  // otApprovals.ts / calculateMonthlyPayroll's approvedOtDates param).
  otApprovalRequired: boolean;
  // See payroll.ts's PayrollPolicy for what each of these does — kept as
  // strings here (matching every other numeric setting in this table) and
  // converted via toPayrollPolicy() below.
  payrollMethod: "hourly" | "daily" | "hybrid";
  payrollDailyRateBasis: "fixed_30" | "actual_days";
  payrollStandardDailyHours: string;
  payrollOtStartsAfterMinutes: string;
  payrollOtMultiplier: string;
  payrollRoundingBlockMinutes: string;
  payrollFullDayMinHours: string;
  payrollHalfDayMinHours: string;
  payrollMaxLateMinutesBeforeHalfDay: string;
  payrollMissingCheckoutHandling: "half_day" | "hr_review";
  payrollWeekendHolidayPaidAsOvertime: boolean;
  // Remote check-in — see lib/remoteCheckIn.ts.
  remoteCheckInMode: "disabled" | "requires_approval" | "auto_approve";
  remoteCheckInRequireGeofence: boolean;
  remoteCheckInExpiryHours: string;
}

function toSettings(row: typeof schema.orgSettings.$inferSelect): OfficeSettings {
  return {
    defaultMorningStart: row.defaultMorningStart,
    defaultMorningEnd: row.defaultMorningEnd,
    defaultAfternoonStart: row.defaultAfternoonStart,
    defaultAfternoonEnd: row.defaultAfternoonEnd,
    lunchBreakEnd: row.lunchBreakEnd,
    lateThresholdMinutes: row.lateThresholdMinutes,
    weeklyOffDay: row.weeklyOffDay,
    payrollShiftStart: row.payrollShiftStart,
    payrollShiftEnd: row.payrollShiftEnd,
    payrollBreakStart: row.payrollBreakStart,
    payrollBreakEnd: row.payrollBreakEnd,
    otApprovalRequired: row.otApprovalRequired,
    payrollMethod: row.payrollMethod,
    payrollDailyRateBasis: row.payrollDailyRateBasis,
    payrollStandardDailyHours: row.payrollStandardDailyHours,
    payrollOtStartsAfterMinutes: row.payrollOtStartsAfterMinutes,
    payrollOtMultiplier: row.payrollOtMultiplier,
    payrollRoundingBlockMinutes: row.payrollRoundingBlockMinutes,
    payrollFullDayMinHours: row.payrollFullDayMinHours,
    payrollHalfDayMinHours: row.payrollHalfDayMinHours,
    payrollMaxLateMinutesBeforeHalfDay: row.payrollMaxLateMinutesBeforeHalfDay,
    payrollMissingCheckoutHandling: row.payrollMissingCheckoutHandling,
    payrollWeekendHolidayPaidAsOvertime: row.payrollWeekendHolidayPaidAsOvertime,
    remoteCheckInMode: row.remoteCheckInMode,
    remoteCheckInRequireGeofence: row.remoteCheckInRequireGeofence,
    remoteCheckInExpiryHours: row.remoteCheckInExpiryHours,
  };
}

// Converts the string-based settings row into the numeric PayrollPolicy
// payroll.ts's calculators actually consume — the one place this mapping
// happens, so every admin route builds it the same way.
export function toPayrollPolicy(settings: OfficeSettings): PayrollPolicy {
  return {
    dailyRateBasis: settings.payrollDailyRateBasis,
    standardDailyHours: Number(settings.payrollStandardDailyHours) || 8,
    otStartsAfterMinutes: Number(settings.payrollOtStartsAfterMinutes) || 0,
    otMultiplier: Number(settings.payrollOtMultiplier) || 1,
    roundingBlockMinutes: Number(settings.payrollRoundingBlockMinutes) || 0,
    graceMinutes: Number(settings.lateThresholdMinutes) || 0,
    fullDayMinHours: Number(settings.payrollFullDayMinHours) || 7,
    halfDayMinHours: Number(settings.payrollHalfDayMinHours) || 4,
    maxLateMinutesBeforeHalfDay: Number(settings.payrollMaxLateMinutesBeforeHalfDay) || 60,
    missingCheckoutHandling: settings.payrollMissingCheckoutHandling,
    weekendHolidayPaidAsOvertime: settings.payrollWeekendHolidayPaidAsOvertime,
    weeklyOffDay: settings.weeklyOffDay,
  };
}

export async function getOfficeSettings(orgId: string): Promise<OfficeSettings> {
  const db = getDb();
  const row = await db.query.orgSettings.findFirst({ where: eq(schema.orgSettings.orgId, orgId) });
  if (!row) {
    // Every org gets a settings row on signup — this only happens for an
    // org created outside that path (e.g. the migration script).
    const [created] = await db.insert(schema.orgSettings).values({ orgId }).returning();
    return toSettings(created);
  }
  return toSettings(row);
}

export async function updateOfficeSettings(
  orgId: string,
  updates: Partial<OfficeSettings>,
): Promise<OfficeSettings> {
  const db = getDb();
  const before = await getOfficeSettings(orgId); // ensure a row exists, and capture the pre-update method
  const [updated] = await db
    .update(schema.orgSettings)
    .set(updates)
    .where(eq(schema.orgSettings.orgId, orgId))
    .returning();

  // Switching into Hybrid: every employee needs an explicit Hourly/Daily
  // choice, but forcing that to be set by hand for an existing roster
  // would silently strand anyone HR forgets. Pre-fill everyone who
  // doesn't already have a choice with whatever the company used before
  // — "nothing changes until HR edits them", per the spec.
  if (updates.payrollMethod === "hybrid" && before.payrollMethod !== "hybrid") {
    await db
      .update(schema.employees)
      .set({ payrollMethod: before.payrollMethod === "daily" ? "daily" : "hourly" })
      .where(and(eq(schema.employees.orgId, orgId), isNull(schema.employees.payrollMethod)));
  }

  return toSettings(updated);
}
