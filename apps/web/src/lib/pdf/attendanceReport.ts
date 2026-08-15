import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate, formatTime } from "../attendance";
import type { DaySummary, EmployeeRanking } from "../../hooks/useAttendanceAnalytics";
import {
  drawFooterOnEveryPage,
  drawMetricsTable,
  drawReportBanner,
  drawSectionTitle,
  getAutoTableFinalY,
  REPORT_TABLE_HEAD_STYLE,
} from "./reportChrome";

export interface AttendanceReportStats {
  totalRecords: number;
  totalCheckIns: number;
  totalCheckOuts: number;
  uniqueDays: number;
  anomalies: number;
}

export interface AttendanceReportInput {
  stats: AttendanceReportStats;
  rankings: EmployeeRanking[];
  summary: DaySummary[];
  filterFromDate: string;
  filterToDate: string;
}

export function exportAttendanceReportPdf({
  stats,
  rankings,
  summary,
  filterFromDate,
  filterToDate,
}: AttendanceReportInput): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const generated = new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });
  const periodText =
    filterFromDate && filterToDate
      ? `${new Date(filterFromDate).toLocaleDateString()} – ${new Date(filterToDate).toLocaleDateString()}`
      : "All Time";

  drawReportBanner(doc, {
    pageWidth,
    margin,
    bannerHeight: 110,
    titleY: 50,
    subtitleY: 70,
    subtitle: "Employee Attendance Report",
    detailLines: [
      { text: `Period: ${periodText}`, y: 88 },
      { text: `Generated: ${generated}`, y: 100 },
    ],
  });

  // ===== KEY METRICS =====
  let y = 140;
  y = drawSectionTitle(doc, pageWidth, margin, y, "Executive Summary", 18);

  const metrics = [
    ["Total Records", String(stats.totalRecords)],
    ["Check-Ins", String(stats.totalCheckIns)],
    ["Check-Outs", String(stats.totalCheckOuts)],
    ["Days Tracked", String(stats.uniqueDays)],
    ["Anomalies", String(stats.anomalies)],
    ["Employees Reported", String(rankings.length)],
  ];
  y = drawMetricsTable(doc, {
    startY: y,
    margin,
    rows: [
      [metrics[0][0], metrics[0][1], metrics[1][0], metrics[1][1], metrics[2][0], metrics[2][1]],
      [metrics[3][0], metrics[3][1], metrics[4][0], metrics[4][1], metrics[5][0], metrics[5][1]],
    ],
  });

  // ===== EMPLOYEE RANKINGS =====
  y = drawSectionTitle(doc, pageWidth, margin, y, "Employee Performance Rankings", 12);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text("Overall Score = Punctuality (40%) + Attendance (30%) + Reliability (30%)", margin, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [[
      "Rank", "Employee", "Role", "Days", "Att %", "Punct.", "Reliab.", "Avg Late", "Avg Hrs", "Score", "Grade",
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
    headStyles: REPORT_TABLE_HEAD_STYLE,
    styles: { fontSize: 9, cellPadding: 5 },
    columnStyles: {
      0: { fontStyle: "bold", halign: "center", cellWidth: 35 },
      1: { fontStyle: "bold" },
      9: { fontStyle: "bold", halign: "right" },
      10: { fontStyle: "bold", halign: "center" },
    },
    margin: { left: margin, right: margin },
  });
  y = getAutoTableFinalY(doc) + 24;

  // ===== ANOMALIES =====
  const anomalyRows = summary.filter((s) => s.hasAnomaly);
  if (anomalyRows.length > 0) {
    if (y > 700) { doc.addPage(); y = 40; }
    y = drawSectionTitle(doc, pageWidth, margin, y, `Anomalies & Missing Records (${anomalyRows.length})`, 12);

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
    y = getAutoTableFinalY(doc) + 24;
  }

  // ===== DAILY ATTENDANCE LOG =====
  doc.addPage();
  y = 40;
  y = drawSectionTitle(doc, pageWidth, margin, y, "Daily Attendance Log", 12);

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
    headStyles: REPORT_TABLE_HEAD_STYLE,
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

  drawFooterOnEveryPage(doc, pageWidth);

  const fileDate = new Date().toISOString().slice(0, 10);
  doc.save(`PST_Attendance_Report_${fileDate}.pdf`);
}
