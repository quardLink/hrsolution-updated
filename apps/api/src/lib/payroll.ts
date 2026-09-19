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

export function getRates(monthlySalary: number, year: number, month: number) {
  const days = daysInMonth(year, month);
  const dailyRate = monthlySalary / days;
  const hourlyRate = dailyRate / 8;
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
 * company shift start or after the company shift end counts as OT.
 */
export function dayOtMinutes(
  checkIn: Date,
  checkOut: Date | null,
  shift: PayrollShiftConfig,
): number {
  if (!checkOut) return 0;

  const shiftStart = timeStringToMinutes(shift.shiftStart);
  const shiftEnd = timeStringToMinutes(shift.shiftEnd);
  const inMin = checkIn.getHours() * 60 + checkIn.getMinutes() + checkIn.getSeconds() / 60;
  const outMin = checkOut.getHours() * 60 + checkOut.getMinutes() + checkOut.getSeconds() / 60;

  const beforeShift = Math.max(0, Math.min(outMin, shiftStart) - inMin);
  const afterShift = Math.max(0, outMin - Math.max(inMin, shiftEnd));

  return beforeShift + afterShift;
}

export interface MonthlyPayrollResult {
  employeeId: string;
  employeeName: string;
  year: number;
  month: number;
  daysInMonth: number;
  dailyRate: number;
  hourlyRate: number;
  totalWorkedHours: number;
  totalOtHours: number;
  otPay: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  leaveDeduction: number;
  absentDays: number;
  absenceDeduction: number;
  baseSalary: number;
  finalSalary: number;
}

export function calculateMonthlyPayroll({
  employee,
  year,
  month, // 1-12
  logs,
  leaveRequests,
  shift,
}: {
  employee: Employee;
  year: number;
  month: number;
  logs: AttendanceLogRow[];
  leaveRequests: LeaveRequest[];
  shift: PayrollShiftConfig;
}): MonthlyPayrollResult {
  const { daysInMonth: dim, dailyRate, hourlyRate } = getRates(employee.monthlySalary, year, month);

  const days = pairDailySessions(logs, employee.id).filter((d) => {
    const [y, m] = d.date.split("-").map(Number);
    return y === year && m === month;
  });

  let totalWorkedMinutes = 0;
  let totalOtMinutes = 0;

  for (const d of days) {
    totalWorkedMinutes += dayWorkedMinutes(d, shift);
    totalOtMinutes += dayOtMinutes(d.checkIn, d.checkOut, shift);
  }

  const otHours = totalOtMinutes / 60;
  const otPay = otHours * hourlyRate;

  // Expand approved leave requests into individual dates within this month
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  for (const lr of leaveRequests) {
    if (lr.status !== "approved") continue;
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

  const leaveDeduction = unpaidLeaveDays * dailyRate;

  // Unexplained absences: elapsed days with no attendance log AND no
  // approved leave request covering them. Without this, a no-show with no
  // leave filed cost nothing — finalSalary started from the full
  // monthlySalary and only unpaid *leave* reduced it.
  const attendedDateKeys = new Set(days.map((d) => d.date));
  const leaveDateKeys = new Set<string>();
  for (const lr of leaveRequests) {
    if (lr.status !== "approved") continue;
    for (
      let d = new Date(lr.fromDate);
      d <= new Date(lr.toDate);
      d.setDate(d.getDate() + 1)
    ) {
      leaveDateKeys.add(dateKey(d));
    }
  }

  const absentDays = getElapsedWorkingDays(year, month).filter(
    (d) => !attendedDateKeys.has(dateKey(d)) && !leaveDateKeys.has(dateKey(d)),
  ).length;
  const absenceDeduction = absentDays * dailyRate;

  const finalSalary = employee.monthlySalary - leaveDeduction - absenceDeduction + otPay;

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    year,
    month,
    daysInMonth: dim,
    dailyRate: round2(dailyRate),
    hourlyRate: round2(hourlyRate),
    totalWorkedHours: round2(totalWorkedMinutes / 60),
    totalOtHours: round2(otHours),
    otPay: round2(otPay),
    paidLeaveDays,
    unpaidLeaveDays,
    leaveDeduction: round2(leaveDeduction),
    absentDays,
    absenceDeduction: round2(absenceDeduction),
    baseSalary: employee.monthlySalary,
    finalSalary: round2(finalSalary),
  };
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
}: {
  employee: Employee;
  date: string; // YYYY-MM-DD
  logs: AttendanceLogRow[];
  shift: PayrollShiftConfig;
}): DailyPayrollResult {
  const [year, month] = date.split("-").map(Number);
  const { dailyRate, hourlyRate } = getRates(employee.monthlySalary, year, month);

  const day = pairDailySessions(logs, employee.id).find((d) => d.date === date) ?? null;

  const workedMinutes = day ? dayWorkedMinutes(day, shift) : 0;
  const otMinutes = day ? dayOtMinutes(day.checkIn, day.checkOut, shift) : 0;
  const otHours = otMinutes / 60;
  const otPay = otHours * hourlyRate;

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
