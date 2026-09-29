import { useEffect, useMemo, useState } from "react";
import {
  getDateKey,
  gradeFromScore,
  minutesEarly,
  minutesLate,
  parseTimestamp,
  scoreFromMinutesLate,
} from "../lib/attendance";
import type { AttendanceSettings, Employee, LogEntry } from "./useAdminAuth";

// A gap between two punch segments on the same day — i.e. a real mid-day
// checkout followed by a checkin, most commonly a lunch/rest break.
export interface BreakInterval {
  start: Date;
  end: Date;
}

// The doc-facing status vocabulary — "unbalanced" covers the rarer
// multi-punch mismatch cases (e.g. 3 check-ins, 2 check-outs) that don't
// map cleanly to any of the others.
export type DayStatus = "present" | "late" | "early_leave" | "missing_checkout" | "weekend" | "unbalanced";

export interface DaySummary {
  date: string;
  dateObj: Date;
  employeeId: string;
  employeeName: string;
  firstCheckIn: Date | null;
  firstCheckInAuthType: string | null;
  firstCheckInDevice: string | null;
  lastCheckOut: Date | null;
  lastCheckOutAuthType: string | null;
  lastCheckOutDevice: string | null;
  breaks: BreakInterval[];
  checkIns: number;
  checkOuts: number;
  totalHours: number;
  hasAnomaly: boolean;
  anomalyReason: string;
  minutesLate: number;
  minutesEarly: number;
  punctualityScore: number;
  status: DayStatus;
}

export interface EmployeeRanking {
  employeeId: string;
  employeeName: string;
  role: string;
  daysPresent: number;
  totalDaysInPeriod: number;
  attendanceRate: number;
  totalHours: number;
  avgHoursPerDay: number;
  avgMinutesLate: number;
  onTimeDays: number;
  lateDays: number;
  punctualityScore: number;
  completedDays: number;
  reliabilityScore: number;
  anomalyCount: number;
  overallScore: number;
  grade: string;
}

export function useAttendanceAnalytics(
  logs: LogEntry[],
  employees: Employee[],
  attendanceSettings: AttendanceSettings | null,
) {
  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  const [filterFromDate, setFilterFromDate] = useState<string>("");
  const [filterToDate, setFilterToDate] = useState<string>("");

  useEffect(() => {
    if (logs.length && !filterFromDate && !filterToDate) {
      const today = new Date();
      const monthAgo = new Date();
      monthAgo.setDate(today.getDate() - 29);
      setFilterFromDate(getDateKey(monthAgo));
      setFilterToDate(getDateKey(today));
    }
  }, [logs, filterFromDate, filterToDate]);

  const employeeMap = useMemo(() => {
    const m = new Map<string, Employee>();
    employees.forEach((e) => m.set(e.id, e));
    return m;
  }, [employees]);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (filterEmployee !== "all" && l.employeeId !== filterEmployee) return false;
      const d = parseTimestamp(l.timestamp);
      if (!d) return false;
      const key = getDateKey(d);
      if (filterFromDate && key < filterFromDate) return false;
      if (filterToDate && key > filterToDate) return false;
      return true;
    });
  }, [logs, filterEmployee, filterFromDate, filterToDate]);

  const summary: DaySummary[] = useMemo(() => {
    // Group raw punches by (date, employee) first — they need to be
    // replayed in chronological order to detect breaks, and log entries
    // aren't guaranteed to arrive already sorted.
    const grouped = new Map<
      string,
      {
        employeeId: string;
        employeeName: string;
        date: string;
        dateObj: Date;
        punches: { action: string; timestamp: Date; authType: string; deviceName: string | null }[];
      }
    >();
    for (const log of filteredLogs) {
      const d = parseTimestamp(log.timestamp);
      if (!d) continue;
      const dateKeyStr = getDateKey(d);
      const key = `${dateKeyStr}_${log.employeeId}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          employeeId: log.employeeId,
          employeeName: log.employeeName,
          date: dateKeyStr,
          dateObj: d,
          punches: [],
        });
      }
      grouped.get(key)!.punches.push({
        action: log.action,
        timestamp: d,
        authType: log.authType,
        deviceName: log.deviceName,
      });
    }

    const result: DaySummary[] = [];
    for (const g of grouped.values()) {
      const sorted = [...g.punches].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Replay into checkin→checkout segments: a checkin opens one, the
      // next checkout closes it, and a further checkin opens a new one —
      // which is exactly what a mid-day break (punch out, punch back in)
      // produces. The gap between two segments is the break itself.
      interface Segment {
        checkIn: Date;
        checkInAuthType: string;
        checkInDevice: string | null;
        checkOut: Date | null;
        checkOutAuthType: string | null;
        checkOutDevice: string | null;
      }
      const segments: Segment[] = [];
      let open: Segment | null = null;
      let checkIns = 0;
      let checkOuts = 0;
      for (const p of sorted) {
        if (p.action === "checkin") {
          checkIns++;
          if (open === null) {
            open = {
              checkIn: p.timestamp,
              checkInAuthType: p.authType,
              checkInDevice: p.deviceName,
              checkOut: null,
              checkOutAuthType: null,
              checkOutDevice: null,
            };
          }
        } else if (p.action === "checkout") {
          checkOuts++;
          if (open !== null) {
            open.checkOut = p.timestamp;
            open.checkOutAuthType = p.authType;
            open.checkOutDevice = p.deviceName;
            segments.push(open);
            open = null;
          }
        }
      }
      if (open !== null) segments.push(open);

      const firstSegment = segments[0];
      const lastSegment = segments[segments.length - 1];
      const firstCheckIn = firstSegment?.checkIn ?? null;
      const lastCheckOut = lastSegment?.checkOut ?? null;

      const breaks: BreakInterval[] = [];
      for (let i = 0; i < segments.length - 1; i++) {
        const end = segments[i].checkOut;
        if (end) breaks.push({ start: end, end: segments[i + 1].checkIn });
      }

      // Sum of actually-worked (closed) segments — for a break day this
      // naturally excludes the break itself, unlike a plain first-to-last
      // span. Single-segment days are unaffected (no policy assumption
      // like payroll's flat break minutes is applied here; this column is
      // "what was actually clocked", not "what gets paid").
      const totalHours = segments.reduce(
        (sum, s) => (s.checkOut ? sum + (s.checkOut.getTime() - s.checkIn.getTime()) / 3600000 : sum),
        0,
      );

      const entry: DaySummary = {
        date: g.date,
        dateObj: g.dateObj,
        employeeId: g.employeeId,
        employeeName: g.employeeName,
        firstCheckIn,
        firstCheckInAuthType: firstSegment?.checkInAuthType ?? null,
        firstCheckInDevice: firstSegment?.checkInDevice ?? null,
        lastCheckOut,
        lastCheckOutAuthType: lastSegment?.checkOutAuthType ?? null,
        lastCheckOutDevice: lastSegment?.checkOutDevice ?? null,
        breaks,
        checkIns,
        checkOuts,
        totalHours,
        hasAnomaly: false,
        anomalyReason: "",
        minutesLate: 0,
        minutesEarly: 0,
        punctualityScore: 0,
        status: "present",
      };

      if (entry.checkIns > 0 && entry.checkOuts === 0) {
        entry.hasAnomaly = true;
        entry.anomalyReason = "Missing check-out";
      } else if (entry.checkOuts > 0 && entry.checkIns === 0) {
        entry.hasAnomaly = true;
        entry.anomalyReason = "Missing check-in";
      } else if (entry.checkIns !== entry.checkOuts) {
        entry.hasAnomaly = true;
        entry.anomalyReason = `${entry.checkIns} check-ins, ${entry.checkOuts} check-outs`;
      }

      const emp = employeeMap.get(entry.employeeId);
      if (entry.firstCheckIn) {
        const expected = emp?.reportingMorning;
        if (expected && expected !== "00:00") {
          entry.minutesLate = minutesLate(entry.firstCheckIn, expected);
          entry.punctualityScore = scoreFromMinutesLate(entry.minutesLate);
        } else {
          entry.punctualityScore = 100;
        }
      }
      if (entry.lastCheckOut && emp?.reportingAfternoonEnd) {
        entry.minutesEarly = minutesEarly(entry.lastCheckOut, emp.reportingAfternoonEnd);
      }

      // Status vocabulary matching the "Present / Late / Early Leave /
      // Missing Checkout / Weekend" scheme — resolved in priority order:
      // a data problem (missing checkout, or the rarer unbalanced-punch
      // case) always wins, then the weekly off day (punctuality doesn't
      // apply to a day nobody was scheduled to work), then punctuality.
      const graceMinutes = Number(attendanceSettings?.lateThresholdMinutes) || 0;
      const weekday = g.dateObj.toLocaleDateString("en-US", { weekday: "long" });
      const isWeeklyOff = attendanceSettings?.weeklyOffDay === weekday;

      if (entry.checkIns > 0 && entry.checkOuts === 0) {
        entry.status = "missing_checkout";
      } else if (entry.checkIns !== entry.checkOuts) {
        entry.status = "unbalanced";
      } else if (isWeeklyOff) {
        entry.status = "weekend";
      } else if (entry.minutesLate > graceMinutes) {
        entry.status = "late";
      } else if (entry.minutesEarly > graceMinutes) {
        entry.status = "early_leave";
      } else {
        entry.status = "present";
      }

      result.push(entry);
    }

    return result.sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return a.employeeName.localeCompare(b.employeeName);
    });
  }, [filteredLogs, employeeMap]);

  const totalDaysInPeriod = useMemo(() => {
    if (!filterFromDate || !filterToDate) return 0;
    const from = new Date(filterFromDate);
    const to = new Date(filterToDate);
    return Math.max(1, Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  }, [filterFromDate, filterToDate]);

  const rankings: EmployeeRanking[] = useMemo(() => {
    const byEmp = new Map<string, DaySummary[]>();
    for (const s of summary) {
      if (!byEmp.has(s.employeeId)) byEmp.set(s.employeeId, []);
      byEmp.get(s.employeeId)!.push(s);
    }
    const list: EmployeeRanking[] = [];
    for (const emp of employees) {
      if (filterEmployee !== "all" && emp.id !== filterEmployee) continue;
      const days = byEmp.get(emp.id) ?? [];
      const daysPresent = days.length;
      const totalHours = days.reduce((sum, d) => sum + d.totalHours, 0);
      const avgHoursPerDay = daysPresent > 0 ? totalHours / daysPresent : 0;
      const lateMinutes = days.filter((d) => d.firstCheckIn).map((d) => d.minutesLate);
      const avgMinutesLate = lateMinutes.length > 0
        ? lateMinutes.reduce((a, b) => a + b, 0) / lateMinutes.length
        : 0;
      const onTimeDays = days.filter((d) => d.firstCheckIn && d.minutesLate <= 15).length;
      const lateDays = days.filter((d) => d.firstCheckIn && d.minutesLate > 15).length;
      const punctualityScores = days.filter((d) => d.firstCheckIn).map((d) => d.punctualityScore);
      const punctualityScore = punctualityScores.length > 0
        ? punctualityScores.reduce((a, b) => a + b, 0) / punctualityScores.length
        : 0;
      const completedDays = days.filter((d) => !d.hasAnomaly && d.firstCheckIn && d.lastCheckOut).length;
      const reliabilityScore = daysPresent > 0 ? (completedDays / daysPresent) * 100 : 0;
      const anomalyCount = days.filter((d) => d.hasAnomaly).length;
      const attendanceRate = totalDaysInPeriod > 0 ? (daysPresent / totalDaysInPeriod) * 100 : 0;
      const overallScore =
        punctualityScore * 0.4 + Math.min(100, attendanceRate) * 0.3 + reliabilityScore * 0.3;
      list.push({
        employeeId: emp.id,
        employeeName: emp.name,
        role: emp.role ?? "",
        daysPresent,
        totalDaysInPeriod,
        attendanceRate,
        totalHours,
        avgHoursPerDay,
        avgMinutesLate,
        onTimeDays,
        lateDays,
        punctualityScore,
        completedDays,
        reliabilityScore,
        anomalyCount,
        overallScore,
        grade: gradeFromScore(overallScore),
      });
    }
    return list.sort((a, b) => b.overallScore - a.overallScore);
  }, [summary, employees, filterEmployee, totalDaysInPeriod]);

  const stats = useMemo(() => {
    const uniqueDays = new Set(summary.map((s) => s.date));
    const anomalies = summary.filter((s) => s.hasAnomaly);
    return {
      totalRecords: filteredLogs.length,
      totalCheckIns: filteredLogs.filter((l) => l.action === "checkin").length,
      totalCheckOuts: filteredLogs.filter((l) => l.action === "checkout").length,
      uniqueDays: uniqueDays.size,
      anomalies: anomalies.length,
    };
  }, [filteredLogs, summary]);

  return {
    filterEmployee,
    setFilterEmployee,
    filterFromDate,
    setFilterFromDate,
    filterToDate,
    setFilterToDate,
    employeeMap,
    filteredLogs,
    summary,
    totalDaysInPeriod,
    rankings,
    stats,
  };
}
