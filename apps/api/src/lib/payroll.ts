// Payroll calculation — kept as pure, self-contained functions so the
// formulas are easy to audit and change in exactly one place.
//
// Company policy: ONE continuous shift (company-wide, e.g. 09:00–18:00, set
// via Settings → payrollShiftStart/payrollShiftEnd) with an assumed break
// window (payrollBreakStart/payrollBreakEnd, e.g. 12:00–13:00) employees
// can take any time during the day — not a fixed window enforced against
// actual punches, just the fallback deduction used when no real mid-day
// checkout/checkin was punched (see dayWorkedMinutes). Every day (including
// the weekly off day) is treated identically: OT is simply any time
// outside [shiftStart, shiftEnd].

import type { AttendanceLogRow } from "./attendanceLogs";
import type { Employee } from "./employees";
import type { LeaveRequest } from "./leaveRequests";

export interface PayrollShiftConfig {
  shiftStart: string;
  shiftEnd: string;
  breakStart: string;
  breakEnd: string;
}

// The company-wide knobs from Settings → Payroll Calculation. Kept
// separate from PayrollShiftConfig (an older, narrower concept already
// threaded through several call sites) rather than merging the two.
export interface PayrollPolicy {
  dailyRateBasis: "fixed_30" | "actual_days";
  standardDailyHours: number;
  otStartsAfterMinutes: number;
  // Applied to the plain hourly rate — 1.5 covers both "Article 107"
  // (hourly + 50% of basic hourly) and "1.5x basic" from the spec, which
  // are the same formula once salary isn't split into basic/housing/etc
  // components (this app tracks one total monthlySalary per employee).
  otMultiplier: number;
  roundingBlockMinutes: number;
  graceMinutes: number;
  fullDayMinHours: number;
  halfDayMinHours: number;
  maxLateMinutesBeforeHalfDay: number;
  missingCheckoutHandling: "half_day" | "hr_review";
  weekendHolidayPaidAsOvertime: boolean;
  weeklyOffDay: string;
}

// Leave types that are FULLY PAID (no salary deduction).
// Everything else (unpaid, emergency, other) deducts one day's rate per day.
// This mapping is an assumption based on typical policy — adjust here if
// your company's actual leave policy differs.
const PAID_LEAVE_TYPES = new Set(["sick", "annual"]);

function timeStringToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Parses the same "MM/DD/YYYY, HH:MM:SS AM/PM" format the sheet stores,
// matching the format produced in routes/attendance.ts.
export function parseLogTimestamp(ts: string): Date | null {
  const cleaned = ts.replace(",", "").trim();
  const m = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})(?:\s*(AM|PM))?/i);
  if (!m) return null;
  const month = parseInt(m[1]) - 1;
  const day = parseInt(m[2]);
  const year = parseInt(m[3]);
  let hour = parseInt(m[4]);
  const min = parseInt(m[5]);
  const sec = parseInt(m[6]);
  const ampm = m[7]?.toUpperCase();
  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  return new Date(year, month, day, hour, min, sec);
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Every day in the given month that has already happened as of today —
 * used to detect unexplained absences. Returns [] for months that haven't
 * started yet, since there's nothing to evaluate. Every day counts (no
 * weekly-off-day exclusion — every day is treated identically).
 */
function getElapsedWorkingDays(year: number, month: number): Date[] {
  const today = new Date();
  const isFutureMonth =
    year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth() + 1);
  if (isFutureMonth) return [];

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;
  const lastDay = isCurrentMonth ? today.getDate() : daysInMonth(year, month);

  const result: Date[] = [];
  for (let day = 1; day <= lastDay; day++) {
    result.push(new Date(year, month - 1, day));
  }
  return result;
}

// dailyRateBasis "fixed_30" divides by a flat 30 regardless of the actual
// month length (the common Saudi convention cited in the payroll spec);
// "actual_days" divides by the real day count instead. daysInMonth in the
// returned object is always the real count — informational, not the rate
// divisor — so callers can still show "of 31 days" correctly either way.
export function getRates(
  monthlySalary: number,
  year: number,
  month: number,
  policy: Pick<PayrollPolicy, "dailyRateBasis" | "standardDailyHours"> = { dailyRateBasis: "actual_days", standardDailyHours: 8 },
) {
  const days = daysInMonth(year, month);
  const rateDivisorDays = policy.dailyRateBasis === "fixed_30" ? 30 : days;
  const dailyRate = monthlySalary / rateDivisorDays;
  const hourlyRate = dailyRate / policy.standardDailyHours;
  return { daysInMonth: days, dailyRate, hourlyRate };
}

// One checkin-to-checkout punch pair. A day with a mid-day break punched
// out and back in produces two of these (pre-break, post-break) instead
// of one spanning the whole day.
export interface DaySegment {
  checkIn: Date;
  checkOut: Date | null;
}

export interface DailyAttendance {
  date: string;
  checkIn: Date; // first checkin of the day — unchanged meaning, used for OT/display
  checkOut: Date | null; // last checkout of the day — null if still clocked in
  segments: DaySegment[];
}

/**
 * Groups an employee's raw log rows into one entry per calendar day,
 * replaying them in chronological order into checkin→checkout segments:
 * a checkin opens a segment, the next checkout closes it, and a further
 * checkin opens a new one — which is exactly what a mid-day break (punch
 * out, punch back in) produces. Duplicate taps of the same action are
 * coalesced (an already-open segment ignores another checkin; a stray
 * checkout with nothing open is ignored). Grouped by date only — the
 * Session column (morning/afternoon_out/afternoon_in/evening) is ignored,
 * since check-in/check-out can happen at any time under the single-shift
 * policy.
 */
export function pairDailySessions(logs: AttendanceLogRow[], employeeId: string): DailyAttendance[] {
  const byDay = new Map<string, { action: string; timestamp: Date }[]>();

  for (const row of logs) {
    if (row.employeeId !== employeeId) continue;
    const t = parseLogTimestamp(row.timestamp);
    if (!t) continue;
    const key = dateKey(t);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push({ action: row.action, timestamp: t });
  }

  const result: DailyAttendance[] = [];
  for (const [date, rows] of byDay) {
    rows.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const segments: DaySegment[] = [];
    let openCheckIn: Date | null = null;
    for (const row of rows) {
      if (row.action === "checkin") {
        if (openCheckIn === null) openCheckIn = row.timestamp;
      } else if (row.action === "checkout" && openCheckIn !== null) {
        segments.push({ checkIn: openCheckIn, checkOut: row.timestamp });
        openCheckIn = null;
      }
    }
    if (openCheckIn !== null) segments.push({ checkIn: openCheckIn, checkOut: null });

    if (segments.length === 0) continue; // stray checkout(s) with no checkin that day
    result.push({
      date,
      checkIn: segments[0].checkIn,
      checkOut: segments[segments.length - 1].checkOut,
      segments,
    });
  }
  return result;
}

/**
 * Worked minutes for one day: the sum of every completed checkin→checkout
 * segment. A single segment (no real mid-day break punched) falls back to
 * subtracting the flat assumed break, preserving the existing behavior for
 * employees who don't punch out for breaks; two or more segments means a
 * real break was recorded, so the gap between them is already excluded and
 * the flat assumption is skipped to avoid double-subtracting it.
 */
export function dayWorkedMinutes(day: DailyAttendance, shift: PayrollShiftConfig): number {
  const closedSegments = day.segments.filter((s): s is { checkIn: Date; checkOut: Date } => s.checkOut !== null);
  if (closedSegments.length === 0) return 0; // never checked out — don't count in-progress time

  const segmentMinutes = closedSegments.reduce(
    (sum, s) => sum + Math.max(0, (s.checkOut.getTime() - s.checkIn.getTime()) / 60000),
    0,
  );

  if (day.segments.length <= 1) {
    const assumedBreakMinutes = Math.max(0, timeStringToMinutes(shift.breakEnd) - timeStringToMinutes(shift.breakStart));
    return Math.max(0, segmentMinutes - assumedBreakMinutes);
  }
  return segmentMinutes;
}

/**
 * OT minutes for one day — exact minutes, no rounding. Any time before the
 * company shift start or after the company shift end counts as OT. When
 * otStartsAfterMinutes is given, a day's total OT is a threshold gate, not
 * a deductible: below the threshold nothing is paid, at or above it the
 * FULL amount is paid — the same shape as a late-arrival grace period,
 * not "first N minutes free".
 */
export function dayOtMinutes(
  checkIn: Date,
  checkOut: Date | null,
  shift: PayrollShiftConfig,
  otStartsAfterMinutes = 0,
): number {
  if (!checkOut) return 0;

  const shiftStart = timeStringToMinutes(shift.shiftStart);
  const shiftEnd = timeStringToMinutes(shift.shiftEnd);
  const inMin = checkIn.getHours() * 60 + checkIn.getMinutes() + checkIn.getSeconds() / 60;
  const outMin = checkOut.getHours() * 60 + checkOut.getMinutes() + checkOut.getSeconds() / 60;

  const beforeShift = Math.max(0, Math.min(outMin, shiftStart) - inMin);
  const afterShift = Math.max(0, outMin - Math.max(inMin, shiftEnd));
  const raw = beforeShift + afterShift;

  return raw >= otStartsAfterMinutes ? raw : 0;
}

/**
 * Late arrival + early leave minutes beyond the grace period, for the
 * Hourly method's "short hours" deduction. Like dayOtMinutes, the grace
 * period gates whether a side counts at all; once past it, the full
 * minutes on that side count (checked independently for arrival and
 * departure — a day can be both late and early).
 */
export function dayShortMinutes(checkIn: Date, checkOut: Date | null, shift: PayrollShiftConfig, graceMinutes: number): number {
  const shiftStart = timeStringToMinutes(shift.shiftStart);
  const inMin = checkIn.getHours() * 60 + checkIn.getMinutes();
  const lateMin = Math.max(0, inMin - shiftStart);
  const late = lateMin > graceMinutes ? lateMin : 0;

  if (!checkOut) return late;

  const shiftEnd = timeStringToMinutes(shift.shiftEnd);
  const outMin = checkOut.getHours() * 60 + checkOut.getMinutes();
  const earlyMin = Math.max(0, shiftEnd - outMin);
  const early = earlyMin > graceMinutes ? earlyMin : 0;

  return late + early;
}

function roundToBlock(minutes: number, block: number): number {
  if (block <= 0) return minutes;
  return Math.round(minutes / block) * block;
}

export interface MonthlyPayrollResult {
  employeeId: string;
  employeeName: string;
  method: "hourly" | "daily";
  year: number;
  month: number;
  daysInMonth: number;
  dailyRate: number;
  hourlyRate: number;
  totalWorkedHours: number;
  totalOtHours: number;
  otPay: number;
  // OT actually worked but excluded from otPay/otHours above because
  // otApprovalRequired is on and HR hasn't approved that day yet — 0
  // whenever the setting is off (every worked OT minute is paid).
  pendingOtHours: number;
  // Hourly method only — late arrival + early leave beyond the grace
  // period, at the plain hourly rate (0 for the Daily method, which
  // penalizes lateness through the half-day threshold instead).
  shortHoursDeduction: number;
  // Hourly method only — count of days where worked+OT exceeded 11h.
  longDayCount: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  leaveDeduction: number;
  absentDays: number;
  absenceDeduction: number;
  // Daily method only.
  fullDays: number;
  halfDays: number;
  halfDayDeduction: number;
  missingCheckoutReviewDays: number;
  baseSalary: number;
  finalSalary: number;
}

const DEFAULT_POLICY: PayrollPolicy = {
  dailyRateBasis: "actual_days",
  standardDailyHours: 8,
  otStartsAfterMinutes: 0,
  otMultiplier: 1,
  roundingBlockMinutes: 0,
  graceMinutes: 0,
  fullDayMinHours: 7,
  halfDayMinHours: 4,
  maxLateMinutesBeforeHalfDay: 60,
  missingCheckoutHandling: "hr_review",
  weekendHolidayPaidAsOvertime: true,
  weeklyOffDay: "Friday",
};

// Expands approved leave requests into paid/unpaid day counts within one
// month, and a set of every date they cover — shared between both payroll
// methods so leave handling never diverges between them.
function expandApprovedLeave(
  leaveRequests: LeaveRequest[],
  year: number,
  month: number,
): { paidLeaveDays: number; unpaidLeaveDays: number; leaveDateKeys: Set<string> } {
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  const leaveDateKeys = new Set<string>();
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  for (const lr of leaveRequests) {
    if (lr.status !== "approved") continue;
    for (let d = new Date(lr.fromDate); d <= new Date(lr.toDate); d.setDate(d.getDate() + 1)) {
      leaveDateKeys.add(dateKey(d));
    }

    const from = new Date(lr.fromDate);
    const to = new Date(lr.toDate);
    const clippedFrom = from < monthStart ? monthStart : from;
    const clippedTo = to > monthEnd ? monthEnd : to;
    if (clippedFrom > clippedTo) continue;

    const dayCount = Math.round((clippedTo.getTime() - clippedFrom.getTime()) / 86400000) + 1;
    if (PAID_LEAVE_TYPES.has(lr.type)) {
      paidLeaveDays += dayCount;
    } else {
      unpaidLeaveDays += dayCount;
    }
  }

  return { paidLeaveDays, unpaidLeaveDays, leaveDateKeys };
}

// Method A ("Hourly") — pay follows hours actually worked, from the
// derived check-in to check-out, minus the unpaid break; overtime is paid
// at a premium once it clears the configured threshold, and late/early
// short hours are deducted at the plain rate.
export function calculateMonthlyPayroll({
  employee,
  year,
  month, // 1-12
  logs,
  leaveRequests,
  shift,
  policy = DEFAULT_POLICY,
  otApprovalRequired = false,
  approvedOtDates,
}: {
  employee: Employee;
  year: number;
  month: number;
  logs: AttendanceLogRow[];
  leaveRequests: LeaveRequest[];
  shift: PayrollShiftConfig;
  policy?: PayrollPolicy;
  // When true, a day's OT only counts toward otHours/otPay if its date is
  // in approvedOtDates — everything else accumulates into pendingOtHours
  // instead of being paid. Callers that don't pass these (e.g. existing
  // tests) get the old always-paid behavior.
  otApprovalRequired?: boolean;
  approvedOtDates?: Set<string>;
}): MonthlyPayrollResult {
  const { daysInMonth: dim, dailyRate, hourlyRate } = getRates(employee.monthlySalary, year, month, policy);

  const days = pairDailySessions(logs, employee.id).filter((d) => {
    const [y, m] = d.date.split("-").map(Number);
    return y === year && m === month;
  });

  let totalWorkedMinutes = 0;
  let totalOtMinutes = 0;
  let pendingOtMinutes = 0;
  let shortMinutes = 0;
  let longDayCount = 0;

  for (const d of days) {
    const workedMin = dayWorkedMinutes(d, shift);
    totalWorkedMinutes += workedMin;

    const dayOtRaw = dayOtMinutes(d.checkIn, d.checkOut, shift, policy.otStartsAfterMinutes);
    const dayOt = roundToBlock(dayOtRaw, policy.roundingBlockMinutes);
    if (dayOt > 0) {
      if (!otApprovalRequired || approvedOtDates?.has(d.date)) {
        totalOtMinutes += dayOt;
      } else {
        pendingOtMinutes += dayOt;
      }
    }

    shortMinutes += dayShortMinutes(d.checkIn, d.checkOut, shift, policy.graceMinutes);
    if ((workedMin + dayOtRaw) / 60 > 11) longDayCount++;
  }

  const otHours = totalOtMinutes / 60;
  const otPay = otHours * hourlyRate * policy.otMultiplier;
  const shortHoursDeduction = (shortMinutes / 60) * hourlyRate;

  const { paidLeaveDays, unpaidLeaveDays, leaveDateKeys } = expandApprovedLeave(leaveRequests, year, month);
  const leaveDeduction = unpaidLeaveDays * dailyRate;

  // Unexplained absences: elapsed days with no attendance log AND no
  // approved leave request covering them. Without this, a no-show with no
  // leave filed cost nothing — finalSalary started from the full
  // monthlySalary and only unpaid *leave* reduced it.
  const attendedDateKeys = new Set(days.map((d) => d.date));
  const absentDays = getElapsedWorkingDays(year, month).filter(
    (d) => !attendedDateKeys.has(dateKey(d)) && !leaveDateKeys.has(dateKey(d)),
  ).length;
  const absenceDeduction = absentDays * dailyRate;

  const finalSalary = employee.monthlySalary - leaveDeduction - absenceDeduction - shortHoursDeduction + otPay;

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    method: "hourly",
    year,
    month,
    daysInMonth: dim,
    dailyRate: round2(dailyRate),
    hourlyRate: round2(hourlyRate),
    totalWorkedHours: round2(totalWorkedMinutes / 60),
    totalOtHours: round2(otHours),
    otPay: round2(otPay),
    pendingOtHours: round2(pendingOtMinutes / 60),
    shortHoursDeduction: round2(shortHoursDeduction),
    longDayCount,
    paidLeaveDays,
    unpaidLeaveDays,
    leaveDeduction: round2(leaveDeduction),
    absentDays,
    absenceDeduction: round2(absenceDeduction),
    fullDays: 0,
    halfDays: 0,
    halfDayDeduction: 0,
    missingCheckoutReviewDays: 0,
    baseSalary: employee.monthlySalary,
    finalSalary: round2(finalSalary),
  };
}

// Method B ("Daily") — each elapsed working day gets one status (Full /
// Half / Absent / Weekend / Leave / needs-review) from the hours worked,
// and pay is deducted per day rather than by the hour.
export function calculateDailyMethodPayroll({
  employee,
  year,
  month,
  logs,
  leaveRequests,
  shift,
  policy = DEFAULT_POLICY,
}: {
  employee: Employee;
  year: number;
  month: number;
  logs: AttendanceLogRow[];
  leaveRequests: LeaveRequest[];
  shift: PayrollShiftConfig;
  policy?: PayrollPolicy;
}): MonthlyPayrollResult {
  const { daysInMonth: dim, dailyRate, hourlyRate } = getRates(employee.monthlySalary, year, month, policy);

  const daysByDate = new Map(
    pairDailySessions(logs, employee.id)
      .filter((d) => {
        const [y, m] = d.date.split("-").map(Number);
        return y === year && m === month;
      })
      .map((d) => [d.date, d]),
  );

  const { paidLeaveDays, unpaidLeaveDays, leaveDateKeys } = expandApprovedLeave(leaveRequests, year, month);
  const leaveDeduction = unpaidLeaveDays * dailyRate;

  let fullDays = 0;
  let halfDays = 0;
  let absentDays = 0;
  let missingCheckoutReviewDays = 0;
  let weekendOtMinutes = 0;

  for (const dateObj of getElapsedWorkingDays(year, month)) {
    const key = dateKey(dateObj);
    const weekday = dateObj.toLocaleDateString("en-US", { weekday: "long" });
    const isWeeklyOff = weekday === policy.weeklyOffDay;
    const day = daysByDate.get(key);

    if (leaveDateKeys.has(key)) continue; // paid/unpaid already captured via leaveDeduction above

    if (isWeeklyOff) {
      if (day && policy.weekendHolidayPaidAsOvertime) {
        // Reuses the same break-aware worked-minutes logic as a normal
        // day (assumed break subtracted unless a real break was punched)
        // rather than summing raw segment spans, so a weekend shift with
        // no separate break punch isn't overpaid by the break window.
        weekendOtMinutes += dayWorkedMinutes(day, shift);
      }
      continue; // weekend/holiday — paid, no deduction either way
    }

    if (!day) {
      absentDays++;
      continue;
    }

    if (day.checkOut === null) {
      if (policy.missingCheckoutHandling === "half_day") {
        halfDays++;
      } else {
        missingCheckoutReviewDays++;
      }
      continue;
    }

    const workedHours = dayWorkedMinutes(day, shift) / 60;
    const lateMinutes = Math.max(0, day.checkIn.getHours() * 60 + day.checkIn.getMinutes() - timeStringToMinutes(shift.shiftStart));
    const forcedHalf = lateMinutes > policy.maxLateMinutesBeforeHalfDay;

    if (!forcedHalf && workedHours >= policy.fullDayMinHours) {
      fullDays++;
    } else if (workedHours >= policy.halfDayMinHours || forcedHalf) {
      halfDays++;
    } else {
      absentDays++;
    }
  }

  const absenceDeduction = absentDays * dailyRate;
  const halfDayDeduction = halfDays * 0.5 * dailyRate;
  const otPay = (weekendOtMinutes / 60) * hourlyRate * policy.otMultiplier;

  const finalSalary = employee.monthlySalary - leaveDeduction - absenceDeduction - halfDayDeduction + otPay;

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    method: "daily",
    year,
    month,
    daysInMonth: dim,
    dailyRate: round2(dailyRate),
    hourlyRate: round2(hourlyRate),
    totalWorkedHours: 0,
    totalOtHours: round2(weekendOtMinutes / 60),
    otPay: round2(otPay),
    pendingOtHours: 0,
    shortHoursDeduction: 0,
    longDayCount: 0,
    paidLeaveDays,
    unpaidLeaveDays,
    leaveDeduction: round2(leaveDeduction),
    absentDays,
    absenceDeduction: round2(absenceDeduction),
    fullDays,
    halfDays,
    halfDayDeduction: round2(halfDayDeduction),
    missingCheckoutReviewDays,
    baseSalary: employee.monthlySalary,
    finalSalary: round2(finalSalary),
  };
}

// Hybrid dispatcher — picks the calculator based on the company's
// companyMethod setting, or the employee's own override when the company
// is on "hybrid" (falling back to companyMethod's non-hybrid predecessor
// isn't needed here since Settings backfills every employee's method the
// moment an org switches into Hybrid — see updateOfficeSettings).
export function calculatePayrollForEmployee(params: {
  employee: Employee & { payrollMethod?: "hourly" | "daily" | null };
  year: number;
  month: number;
  logs: AttendanceLogRow[];
  leaveRequests: LeaveRequest[];
  shift: PayrollShiftConfig;
  policy?: PayrollPolicy;
  companyMethod: "hourly" | "daily" | "hybrid";
  otApprovalRequired?: boolean;
  approvedOtDates?: Set<string>;
}): MonthlyPayrollResult {
  const effectiveMethod =
    params.companyMethod === "hybrid" ? (params.employee.payrollMethod ?? "hourly") : params.companyMethod;

  return effectiveMethod === "daily" ? calculateDailyMethodPayroll(params) : calculateMonthlyPayroll(params);
}

export interface DailyPayrollResult {
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  checkIn: string | null; // ISO timestamp
  checkOut: string | null; // ISO timestamp
  dailyRate: number;
  hourlyRate: number;
  workedHours: number;
  otHours: number;
  otPay: number;
}

/**
 * One day's figures for one employee — used by the midnight job to append a
 * per-day audit row to the Payroll sheet. Distinct from
 * calculateMonthlyPayroll: no leave/absence handling here, just what was
 * actually logged for this single date.
 */
export function calculateDailyPayroll({
  employee,
  date,
  logs,
  shift,
  policy = DEFAULT_POLICY,
}: {
  employee: Employee;
  date: string; // YYYY-MM-DD
  logs: AttendanceLogRow[];
  shift: PayrollShiftConfig;
  policy?: PayrollPolicy;
}): DailyPayrollResult {
  const [year, month] = date.split("-").map(Number);
  const { dailyRate, hourlyRate } = getRates(employee.monthlySalary, year, month, policy);

  const day = pairDailySessions(logs, employee.id).find((d) => d.date === date) ?? null;

  const workedMinutes = day ? dayWorkedMinutes(day, shift) : 0;
  const otMinutes = day
    ? roundToBlock(dayOtMinutes(day.checkIn, day.checkOut, shift, policy.otStartsAfterMinutes), policy.roundingBlockMinutes)
    : 0;
  const otHours = otMinutes / 60;
  const otPay = otHours * hourlyRate * policy.otMultiplier;

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    date,
    checkIn: day ? day.checkIn.toISOString() : null,
    checkOut: day?.checkOut ? day.checkOut.toISOString() : null,
    dailyRate: round2(dailyRate),
    hourlyRate: round2(hourlyRate),
    workedHours: round2(workedMinutes / 60),
    otHours: round2(otHours),
    otPay: round2(otPay),
  };
}

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}
