import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { playChime } from "../lib/chime";
import EmployeesTab from "../components/admin/EmployeesTab";
import SettingsTab from "../components/admin/SettingsTab";
import LeaveRequestsTab from "../components/admin/LeaveRequestsTab";
import PayrollTab from "../components/admin/PayrollTab";
import AdminShell, { type AdminView } from "../components/admin/AdminShell";
import TodayTab from "../components/admin/TodayTab";

interface LogEntry {
  timestamp: string;
  employeeName: string;
  employeeId: string;
  session: string;
  action: string;
  status: string;
  message: string;
}

interface Employee {
  id: string;
  name: string;
  role?: string;
  reportingMorning?: string;
  reportingAfternoon?: string;
}

const STORAGE_KEY = "pst_admin_password";

function parseTimestamp(ts: string): Date | null {
  const cleaned = ts.replace(",", "").trim();
  const m = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})[ ]+(\d{1,2}):(\d{2}):(\d{2})(?:\s*(AM|PM))?/i);
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

function getDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function parseHHmm(s: string): { h: number; m: number } | null {
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return { h: parseInt(m[1]), m: parseInt(m[2]) };
}

function minutesLate(checkIn: Date, expected: string): number {
  const t = parseHHmm(expected);
  if (!t) return 0;
  const expectedMin = t.h * 60 + t.m;
  const actualMin = checkIn.getHours() * 60 + checkIn.getMinutes();
  return Math.max(0, actualMin - expectedMin);
}

function scoreFromMinutesLate(min: number): number {
  if (min <= 5) return 100;
  if (min <= 15) return 90;
  if (min <= 30) return 75;
  if (min <= 60) return 50;
  if (min <= 120) return 25;
  return 10;
}

function gradeFromScore(score: number): string {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 80) return "B+";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  return "F";
}

interface DaySummary {
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

interface EmployeeRanking {
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

export default function AdminPage() {
  const [password, setPassword] = useState<string>(() => localStorage.getItem(STORAGE_KEY) ?? "");
  const [authed, setAuthed] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  const [filterFromDate, setFilterFromDate] = useState<string>("");
  const [filterToDate, setFilterToDate] = useState<string>("");
  const [view, setView] = useState<AdminView>("today");

  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");

  async function fetchLogs(pwd: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${baseUrl}/api/admin/logs`, {
        headers: { "x-admin-password": pwd },
      });
      if (res.status === 401) {
        setAuthError("Invalid password");
        setAuthed(false);
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      if (!res.ok) {
        setError("Failed to load logs");
        return;
      }
      const data = await res.json();
      setLogs(data.logs ?? []);
      setEmployees(data.employees ?? []);
      setAuthed(true);
      setAuthError("");
      localStorage.setItem(STORAGE_KEY, pwd);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (password) fetchLogs(password);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    fetchLogs(password);
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY);
    setPassword("");
    setAuthed(false);
    setLogs([]);
  }

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

  function exportPdf() {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;
    const generated = new Date().toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
    });
    const periodText =
      filterFromDate && filterToDate
        ? `${new Date(filterFromDate).toLocaleDateString()} – ${new Date(filterToDate).toLocaleDateString()}`
        : "All Time";

    // ===== HEADER (cover) =====
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 110, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("PETRO SAFE TECH", margin, 50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(180, 200, 230);
    doc.text("Employee Attendance Report", margin, 70);
    doc.setFontSize(9);
    doc.text(`Period: ${periodText}`, margin, 88);
    doc.text(`Generated: ${generated}`, margin, 100);

    // ===== KEY METRICS =====
    let y = 140;
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Executive Summary", margin, y);
    y += 6;
    doc.setDrawColor(220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 18;

    const metrics = [
      ["Total Records", String(stats.totalRecords)],
      ["Check-Ins", String(stats.totalCheckIns)],
      ["Check-Outs", String(stats.totalCheckOuts)],
      ["Days Tracked", String(stats.uniqueDays)],
      ["Anomalies", String(stats.anomalies)],
      ["Employees Reported", String(rankings.length)],
    ];
    autoTable(doc, {
      startY: y,
      head: [],
      body: [
        [metrics[0][0], metrics[0][1], metrics[1][0], metrics[1][1], metrics[2][0], metrics[2][1]],
        [metrics[3][0], metrics[3][1], metrics[4][0], metrics[4][1], metrics[5][0], metrics[5][1]],
      ],
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 6, textColor: [40, 40, 40] },
      columnStyles: {
        0: { fontStyle: "bold", fillColor: [241, 245, 249] },
        2: { fontStyle: "bold", fillColor: [241, 245, 249] },
        4: { fontStyle: "bold", fillColor: [241, 245, 249] },
      },
      margin: { left: margin, right: margin },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;

    // ===== EMPLOYEE RANKINGS =====
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text("Employee Performance Rankings", margin, y);
    y += 6;
    doc.line(margin, y, pageWidth - margin, y);
    y += 12;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
      "Overall Score = Punctuality (40%) + Attendance (30%) + Reliability (30%)",
      margin,
      y,
    );
    y += 10;

    autoTable(doc, {
      startY: y,
      head: [[
        "Rank",
        "Employee",
        "Role",
        "Days",
        "Att %",
        "Punct.",
        "Reliab.",
        "Avg Late",
        "Avg Hrs",
        "Score",
        "Grade",
      ]],
      body: rankings.map((r, i) => [
        i === 0 ? "1st" : i === 1 ? "2nd" : i === 2 ? "3rd" : `${i + 1}th`,
        r.employeeName,
        r.role,
        `${r.daysPresent}/${r.totalDaysInPeriod}`,
        `${r.attendanceRate.toFixed(0)}%`,
        r.punctualityScore.toFixed(0),
        `${r.reliabilityScore.toFixed(0)}%`,
        `${r.avgMinutesLate.toFixed(0)}m`,
        r.avgHoursPerDay.toFixed(1),
        r.overallScore.toFixed(1),
        r.grade,
      ]),
      theme: "striped",
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 5 },
      columnStyles: {
        0: { fontStyle: "bold", halign: "center", cellWidth: 35 },
        1: { fontStyle: "bold" },
        9: { fontStyle: "bold", halign: "right" },
        10: { fontStyle: "bold", halign: "center" },
      },
      margin: { left: margin, right: margin },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;

    // ===== ANOMALIES =====
    const anomalyRows = summary.filter((s) => s.hasAnomaly);
    if (anomalyRows.length > 0) {
      if (y > 700) { doc.addPage(); y = 40; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(30, 41, 59);
      doc.text(`Anomalies & Missing Records (${anomalyRows.length})`, margin, y);
      y += 6;
      doc.line(margin, y, pageWidth - margin, y);
      y += 12;

      autoTable(doc, {
        startY: y,
        head: [["Date", "Employee", "Check-In", "Check-Out", "Issue"]],
        body: anomalyRows.map((s) => [
          formatDate(s.dateObj),
          s.employeeName,
          s.firstCheckIn ? formatTime(s.firstCheckIn) : "—",
          s.lastCheckOut ? formatTime(s.lastCheckOut) : "—",
          s.anomalyReason,
        ]),
        theme: "striped",
        headStyles: { fillColor: [180, 83, 9], textColor: 255, fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 4 },
        margin: { left: margin, right: margin },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
    }

    // ===== DAILY ATTENDANCE LOG =====
    doc.addPage();
    y = 40;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text("Daily Attendance Log", margin, y);
    y += 6;
    doc.line(margin, y, pageWidth - margin, y);
    y += 12;

    autoTable(doc, {
      startY: y,
      head: [["Date", "Employee", "First In", "Last Out", "Hours", "Late", "Status"]],
      body: summary.map((s) => [
        formatDate(s.dateObj),
        s.employeeName,
        s.firstCheckIn ? formatTime(s.firstCheckIn) : "—",
        s.lastCheckOut ? formatTime(s.lastCheckOut) : "—",
        s.totalHours > 0 ? s.totalHours.toFixed(1) : "—",
        s.minutesLate > 0 ? `${s.minutesLate}m` : "—",
        s.hasAnomaly ? s.anomalyReason : "Complete",
      ]),
      theme: "striped",
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 4 },
      margin: { left: margin, right: margin },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 6) {
          if (data.cell.raw !== "Complete") {
            data.cell.styles.textColor = [180, 83, 9];
            data.cell.styles.fontStyle = "bold";
          } else {
            data.cell.styles.textColor = [21, 128, 61];
          }
        }
      },
    });

    // ===== FOOTER on every page =====
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(140);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Petro Safe Tech — Confidential  |  Page ${i} of ${total}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 20,
        { align: "center" },
      );
    }

    const fileDate = new Date().toISOString().slice(0, 10);
    doc.save(`PST_Attendance_Report_${fileDate}.pdf`);
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#0f172a] p-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 space-y-6"
        >
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-100 flex items-center justify-center text-3xl mb-4">
              🔐
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Access</h1>
            <p className="text-gray-500 text-sm mt-1">Petro Safe Tech Attendance</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            {authError && (
              <p className="text-red-600 text-sm mt-2">{authError}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Sign In"}
          </button>
          <Link href="/" className="block text-center text-blue-600 text-sm hover:underline">
            ← Back to Attendance
          </Link>
        </form>
      </div>
    );
  }

  const isReportView = view === "rankings" || view === "summary";

  return (
    <AdminShell
      view={view}
      onViewChange={setView}
      onLogout={handleLogout}
      onRefresh={() => fetchLogs(password)}
      onTestSound={() => playChime()}
      loading={loading}
    >
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 lg:p-4 text-sm">
          {error}
        </div>
      )}

      {view === "today" && (
        <TodayTab logs={logs} employees={employees} />
      )}

      {isReportView && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
            <StatCard label="Total Records" value={stats.totalRecords} color="blue" />
            <StatCard label="Check-Ins" value={stats.totalCheckIns} color="emerald" />
            <StatCard label="Check-Outs" value={stats.totalCheckOuts} color="indigo" />
            <StatCard label="Days Tracked" value={stats.uniqueDays} color="violet" />
            <StatCard label="Anomalies" value={stats.anomalies} color="amber" />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 lg:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
                <input
                  type="date"
                  value={filterFromDate}
                  onChange={(e) => setFilterFromDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
                <input
                  type="date"
                  value={filterToDate}
                  onChange={(e) => setFilterToDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Employee</label>
                <select
                  value={filterEmployee}
                  onChange={(e) => setFilterEmployee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">All Employees</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.id})</option>
                  ))}
                </select>
              </div>
              <button
                onClick={exportPdf}
                className="w-full px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                title="Generate professional PDF report"
              >
                📄 Export PDF
              </button>
            </div>
          </div>
        </>
      )}

      {view === "rankings" && (
          <div className="space-y-6">
            {/* Top 3 podium */}
            {rankings.length >= 3 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <PodiumCard rank={2} ranking={rankings[1]} />
                <PodiumCard rank={1} ranking={rankings[0]} />
                <PodiumCard rank={3} ranking={rankings[2]} />
              </div>
            )}

            {/* Full ranking table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">Performance Rankings</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Score = Punctuality 40% + Attendance 30% + Reliability 30%
                  </p>
                </div>
                <div className="text-xs text-gray-500">
                  Period: {totalDaysInPeriod} day(s)
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase text-gray-500 bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-3 text-center">Rank</th>
                      <th className="px-3 py-3 text-left">Employee</th>
                      <th className="px-3 py-3 text-left">Role</th>
                      <th className="px-3 py-3 text-center">Days</th>
                      <th className="px-3 py-3 text-center">Attendance</th>
                      <th className="px-3 py-3 text-center">Punctuality</th>
                      <th className="px-3 py-3 text-center">Reliability</th>
                      <th className="px-3 py-3 text-center">Avg Late</th>
                      <th className="px-3 py-3 text-center">Avg Hrs/Day</th>
                      <th className="px-3 py-3 text-center">Score</th>
                      <th className="px-3 py-3 text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((r, i) => (
                      <tr key={r.employeeId} className={`border-b border-gray-100 hover:bg-gray-50 ${i < 3 ? "bg-amber-50/30" : ""}`}>
                        <td className="px-3 py-3 text-center font-bold">
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-semibold text-gray-900">{r.employeeName}</div>
                          <div className="text-xs text-gray-500">{r.employeeId}</div>
                        </td>
                        <td className="px-3 py-3 text-gray-700 capitalize text-xs">{r.role.replace("_", " ")}</td>
                        <td className="px-3 py-3 text-center text-gray-700">
                          {r.daysPresent}<span className="text-gray-400">/{r.totalDaysInPeriod}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <ScoreBar value={Math.min(100, r.attendanceRate)} suffix="%" />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <ScoreBar value={r.punctualityScore} />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <ScoreBar value={r.reliabilityScore} suffix="%" />
                        </td>
                        <td className="px-3 py-3 text-center text-gray-700">
                          {r.avgMinutesLate > 0 ? `${r.avgMinutesLate.toFixed(0)}m` : <span className="text-emerald-600 font-medium">0m</span>}
                        </td>
                        <td className="px-3 py-3 text-center text-gray-700">
                          {r.avgHoursPerDay > 0 ? r.avgHoursPerDay.toFixed(1) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-gray-900">
                          {r.overallScore.toFixed(1)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <GradeBadge grade={r.grade} />
                        </td>
                      </tr>
                    ))}
                    {rankings.length === 0 && (
                      <tr>
                        <td colSpan={11} className="text-center py-12 text-gray-400">
                          No data for the selected period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {view === "summary" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h2 className="font-semibold text-gray-900">Daily Attendance Summary</h2>
              <p className="text-xs text-gray-500 mt-0.5">{summary.length} record(s)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase text-gray-500 bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Employee</th>
                    <th className="px-4 py-3 text-left">First Check-In</th>
                    <th className="px-4 py-3 text-left">Last Check-Out</th>
                    <th className="px-4 py-3 text-left">Hours</th>
                    <th className="px-4 py-3 text-left">Late</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((s, i) => (
                    <tr key={i} className={`border-b border-gray-100 hover:bg-gray-50 ${s.hasAnomaly ? "bg-amber-50/40" : ""}`}>
                      <td className="px-4 py-3 text-gray-900 font-medium">{formatDate(s.dateObj)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{s.employeeName}</div>
                        <div className="text-xs text-gray-500">{s.employeeId}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {s.firstCheckIn ? formatTime(s.firstCheckIn) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {s.lastCheckOut ? formatTime(s.lastCheckOut) : <span className="text-red-500 font-medium">Missing</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {s.totalHours > 0 ? `${s.totalHours.toFixed(1)} h` : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {s.minutesLate > 0 ? (
                          <span className="text-amber-700 font-medium">{s.minutesLate}m</span>
                        ) : s.firstCheckIn ? (
                          <span className="text-emerald-600 font-medium">On time</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {s.hasAnomaly ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            ⚠ {s.anomalyReason}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            ✓ Complete
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {summary.length === 0 && !loading && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-400">
                        No records found for the selected filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}


        {view === "employees" && (
          <EmployeesTab password={password} baseUrl={baseUrl} onError={setError} />
        )}

        {view === "leave" && (
          <LeaveRequestsTab password={password} baseUrl={baseUrl} onError={setError} />
        )}

        {view === "payroll" && (
          <PayrollTab password={password} baseUrl={baseUrl} onError={setError} />
        )}

      {view === "settings" && (
        <SettingsTab
          password={password}
          baseUrl={baseUrl}
          onError={setError}
          onPasswordChanged={(newPwd) => {
            setPassword(newPwd);
            localStorage.setItem(STORAGE_KEY, newPwd);
          }}
        />
      )}
    </AdminShell>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "from-blue-500 to-blue-600",
    emerald: "from-emerald-500 to-emerald-600",
    indigo: "from-indigo-500 to-indigo-600",
    violet: "from-violet-500 to-violet-600",
    amber: "from-amber-500 to-amber-600",
  };
  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} rounded-xl shadow-md text-white p-4`}>
      <div className="text-xs uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  );
}

function PodiumCard({ rank, ranking }: { rank: number; ranking: EmployeeRanking }) {
  const config = {
    1: { medal: "🥇", bg: "from-amber-400 to-yellow-500", height: "md:py-8", label: "1st Place" },
    2: { medal: "🥈", bg: "from-gray-300 to-gray-400", height: "md:py-6", label: "2nd Place" },
    3: { medal: "🥉", bg: "from-amber-700 to-amber-800", height: "md:py-6", label: "3rd Place" },
  }[rank]!;
  return (
    <div className={`bg-gradient-to-br ${config.bg} rounded-2xl shadow-lg text-white p-6 ${config.height} text-center`}>
      <div className="text-5xl mb-2">{config.medal}</div>
      <div className="text-xs uppercase tracking-wider opacity-90">{config.label}</div>
      <div className="text-2xl font-bold mt-1">{ranking.employeeName}</div>
      <div className="text-sm opacity-90 capitalize mb-3">{ranking.role.replace("_", " ")}</div>
      <div className="bg-white/20 rounded-lg px-3 py-2 mt-2">
        <div className="text-3xl font-bold">{ranking.overallScore.toFixed(1)}</div>
        <div className="text-xs uppercase opacity-80">Overall Score · Grade {ranking.grade}</div>
      </div>
    </div>
  );
}

function ScoreBar({ value, suffix = "" }: { value: number; suffix?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const color = v >= 90 ? "bg-emerald-500" : v >= 75 ? "bg-blue-500" : v >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden min-w-[60px]">
        <div className={`h-full ${color} transition-all`} style={{ width: `${v}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-700 w-10 text-right">{v.toFixed(0)}{suffix}</span>
    </div>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  const colorMap: Record<string, string> = {
    "A+": "bg-emerald-100 text-emerald-700",
    "A": "bg-emerald-100 text-emerald-700",
    "B+": "bg-blue-100 text-blue-700",
    "B": "bg-blue-100 text-blue-700",
    "C": "bg-amber-100 text-amber-700",
    "D": "bg-orange-100 text-orange-700",
    "F": "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${colorMap[grade] ?? "bg-gray-100 text-gray-700"}`}>
      {grade}
    </span>
  );
}
