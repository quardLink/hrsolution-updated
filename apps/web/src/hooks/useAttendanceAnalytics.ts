import { useEffect, useMemo, useState } from "react";
import {
  getDateKey,
  gradeFromScore,
  minutesLate,
  parseTimestamp,
  scoreFromMinutesLate,
} from "../lib/attendance";
import type { Employee, LogEntry } from "./useAdminAuth";

export interface DaySummary {
  date: string;
  dateObj: Date;
  employeeId: string;
  employeeName: string;
  firstCheckIn: Date | null;
  lastCheckOut: Date | null;
  checkIns: number;
  checkOuts: number;
  totalHours: number;
  hasAnomaly: boolean;
  anomalyReason: string;
  minutesLate: number;
  punctualityScore: number;
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

export function useAttendanceAnalytics(logs: LogEntry[], employees: Employee[]) {
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
    const map = new Map<string, DaySummary>();
    for (const log of filteredLogs) {
      const d = parseTimestamp(log.timestamp);
      if (!d) continue;
      const dateKey = getDateKey(d);
      const key = `${dateKey}_${log.employeeId}`;
      if (!map.has(key)) {
        map.set(key, {
          date: dateKey,
          dateObj: d,
          employeeId: log.employeeId,
          employeeName: log.employeeName,
          firstCheckIn: null,
          lastCheckOut: null,
          checkIns: 0,
          checkOuts: 0,
          totalHours: 0,
          hasAnomaly: false,
          anomalyReason: "",
          minutesLate: 0,
          punctualityScore: 0,
        });
      }
      const entry = map.get(key)!;
      if (log.action === "checkin") {
        entry.checkIns++;
        if (!entry.firstCheckIn || d < entry.firstCheckIn) entry.firstCheckIn = d;
      } else if (log.action === "checkout") {
        entry.checkOuts++;
        if (!entry.lastCheckOut || d > entry.lastCheckOut) entry.lastCheckOut = d;
      }
    }
    for (const e of map.values()) {
      if (e.firstCheckIn && e.lastCheckOut) {
        e.totalHours = (e.lastCheckOut.getTime() - e.firstCheckIn.getTime()) / (1000 * 60 * 60);
      }
      if (e.checkIns > 0 && e.checkOuts === 0) {
        e.hasAnomaly = true;
        e.anomalyReason = "Missing check-out";
      } else if (e.checkOuts > 0 && e.checkIns === 0) {
        e.hasAnomaly = true;
        e.anomalyReason = "Missing check-in";
      } else if (e.checkIns !== e.checkOuts) {
        e.hasAnomaly = true;
        e.anomalyReason = `${e.checkIns} check-ins, ${e.checkOuts} check-outs`;
      }
      if (e.firstCheckIn) {
        const emp = employeeMap.get(e.employeeId);
        const expected = emp?.reportingMorning;
        if (expected && expected !== "00:00") {
          e.minutesLate = minutesLate(e.firstCheckIn, expected);
          e.punctualityScore = scoreFromMinutesLate(e.minutesLate);
        } else {
          e.punctualityScore = 100;
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => {
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
