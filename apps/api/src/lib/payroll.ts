// Payroll calculation — kept as pure, self-contained functions so the
// formulas are easy to audit and change in exactly one place.
//
// IMPORTANT DESIGN NOTE (read before trusting real payroll numbers):
// The current kiosk UI (AttendancePage.tsx) only logs TWO events per day —
// a "morning" checkin and an "evening" checkout — even though employees
// have a split shift (morning block + afternoon block with a break between,
// e.g. 08:00–13:30 then 16:00–19:00). The API still supports four session
// slots (morning / afternoon_out / afternoon_in / evening) for a full
// break-tracking flow, but nothing currently calls afternoon_out/afternoon_in.
//
// Because of this, worked time is calculated as:
//   (evening checkout − morning checkin) − scheduled break duration
// where "scheduled break duration" = employee's afternoonStart − morningEnd,
// i.e. we ASSUME the employee took their official break rather than
// measuring it directly. If you want break time measured for real instead
// of assumed, reinstate the 4-tap flow in AttendancePage.tsx — the backend
// already has everywhere it needs (session values afternoon_out/afternoon_in)
// to support it; this module would then need a small update to sum two
// measured blocks instead of subtracting a fixed break.

import type { AttendanceLogRow } from "./googleSheets";
import type { Employee } from "./employees";
import type { LeaveRequest } from "./leaveRequests";

export interface EffectiveSchedule {
  morningStart: string;
  morningEnd: string;
  afternoonStart: string;
  afternoonEnd: string;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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

export function isWeeklyOffDay(d: Date, weeklyOffDayName: string): boolean {
  return DAY_NAMES[d.getDay()] === weeklyOffDayName;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getRates(monthlySalary: number, year: number, month: number) {
  const days = daysInMonth(year, month);
  const dailyRate = monthlySalary / days;
  const hourlyRate = dailyRate / 8;
  return { daysInMonth: days, dailyRate, hourlyRate };
}

/**
 * Groups an employee's raw log rows into one entry per calendar day, picking
 * the FIRST "checkin" event and the LAST "checkout" event of that day
 * (guards against duplicate taps without losing real check-in/out times).
 */
export function pairDailySessions(
  logs: AttendanceLogRow[],
  employeeId: string,
): { date: string; checkIn: Date; checkOut: Date | null }[] {
  const byDay = new Map<string, { checkIn: Date | null; checkOut: Date | null }>();

  for (const row of logs) {
    if (row.employeeId !== employeeId) continue;
    const t = parseLogTimestamp(row.timestamp);
    if (!t) continue;
    const key = dateKey(t);
    const entry = byDay.get(key) ?? { checkIn: null, checkOut: null };

    if (row.action === "checkin") {
      if (!entry.checkIn || t < entry.checkIn) entry.checkIn = t;
    } else if (row.action === "checkout") {
      if (!entry.checkOut || t > entry.checkOut) entry.checkOut = t;
    }
    byDay.set(key, entry);
  }

  const result: { date: string; checkIn: Date; checkOut: Date | null }[] = [];
  for (const [date, entry] of byDay) {
    if (entry.checkIn) result.push({ date, checkIn: entry.checkIn, checkOut: entry.checkOut });
  }
  return result;
}

/**
 * Worked minutes for one day, with the employee's scheduled break
 * subtracted (see module-level note above on why it's subtracted rather
 * than measured).
 */
export function dayWorkedMinutes(
  checkIn: Date,
  checkOut: Date | null,
  schedule: EffectiveSchedule,
  isOffDay: boolean,
): number {
  if (!checkOut) return 0; // no checkout yet — don't count in-progress time
  const rawMinutes = Math.max(0, (checkOut.getTime() - checkIn.getTime()) / 60000);

  if (isOffDay) return rawMinutes; // no scheduled break exists on an off day

  const breakMinutes = Math.max(
    0,
    timeStringToMinutes(schedule.afternoonStart) - timeStringToMinutes(schedule.morningEnd),
  );
  return Math.max(0, rawMinutes - breakMinutes);
}

/**
 * OT minutes for one day — exact minutes, no rounding.
 * - Off day (e.g. Friday): the entire worked span counts as OT.
 * - Normal day: minutes before morningStart or after afternoonEnd count as OT.
 */
export function dayOtMinutes(
  checkIn: Date,
  checkOut: Date | null,
  schedule: EffectiveSchedule,
  isOffDay: boolean,
): number {
  if (!checkOut) return 0;

  if (isOffDay) {
    return Math.max(0, (checkOut.getTime() - checkIn.getTime()) / 60000);
  }

  const shiftStart = timeStringToMinutes(schedule.morningStart);
  const shiftEnd = timeStringToMinutes(schedule.afternoonEnd);
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
  baseSalary: number;
  finalSalary: number;
}

export function calculateMonthlyPayroll({
  employee,
  year,
  month, // 1-12
  logs,
  leaveRequests,
  weeklyOffDay,
  officeDefaults,
}: {
  employee: Employee;
  year: number;
  month: number;
  logs: AttendanceLogRow[];
  leaveRequests: LeaveRequest[];
  weeklyOffDay: string;
  officeDefaults: EffectiveSchedule;
}): MonthlyPayrollResult {
  const schedule: EffectiveSchedule = employee.useCustomSchedule
    ? {
        morningStart: employee.morningStart,
        morningEnd: employee.morningEnd,
        afternoonStart: employee.afternoonStart,
        afternoonEnd: employee.afternoonEnd,
      }
    : officeDefaults;

  const { daysInMonth: dim, dailyRate, hourlyRate } = getRates(employee.monthlySalary, year, month);

  const days = pairDailySessions(logs, employee.id).filter((d) => {
    const [y, m] = d.date.split("-").map(Number);
    return y === year && m === month;
  });

  let totalWorkedMinutes = 0;
  let totalOtMinutes = 0;

  for (const d of days) {
    const off = isWeeklyOffDay(d.checkIn, weeklyOffDay);
    totalWorkedMinutes += dayWorkedMinutes(d.checkIn, d.checkOut, schedule, off);
    totalOtMinutes += dayOtMinutes(d.checkIn, d.checkOut, schedule, off);
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
  const finalSalary = employee.monthlySalary - leaveDeduction + otPay;

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
    baseSalary: employee.monthlySalary,
    finalSalary: round2(finalSalary),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
