import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  drawFooterOnEveryPage,
  drawMetricsTable,
  drawReportBanner,
  drawSectionTitle,
  REPORT_TABLE_HEAD_STYLE,
} from "./reportChrome";

export interface PayrollResult {
  employeeId: string;
  employeeName: string;
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

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export interface PayrollReportInput {
  year: number;
  month: number;
  results: PayrollResult[];
}

export function exportPayrollReportPdf({ year, month, results }: PayrollReportInput): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const periodText = `${MONTH_NAMES[month - 1]} ${year}`;
  const generated = new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });

  const totalPayout = results.reduce((sum, r) => sum + r.finalSalary, 0);
  const totalOtCost = results.reduce((sum, r) => sum + r.otPay, 0);
  const totalDeductions = results.reduce((sum, r) => sum + r.leaveDeduction + r.absenceDeduction, 0);

  drawReportBanner(doc, {
    pageWidth,
    margin,
    bannerHeight: 90,
    titleY: 42,
    subtitleY: 62,
    subtitle: `Payroll Report — ${periodText}`,
    detailLines: [{ text: `Generated: ${generated}`, y: 78 }],
  });

  let y = 120;
  y = drawSectionTitle(doc, pageWidth, margin, y, "Summary", 18);

  y = drawMetricsTable(doc, {
    startY: y,
    margin,
    rows: [[
      "Employees", String(results.length),
      "Total Payout", `SAR ${totalPayout.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      "Total OT Cost", `SAR ${totalOtCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      "Total Deductions", `SAR ${totalDeductions.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    ]],
  });

  y = drawSectionTitle(doc, pageWidth, margin, y, "Employee Payroll Detail", 12);

  autoTable(doc, {
    startY: y,
    head: [[
      "Employee", "Base Salary", "Worked Hrs", "OT Hrs", "OT Pay",
      "Paid Leave", "Unpaid Leave", "Absent Days", "Deduction", "Final Salary",
    ]],
    body: results.map((r) => [
      r.employeeName,
      `SAR ${r.baseSalary.toLocaleString()}`,
      String(r.totalWorkedHours),
      String(r.totalOtHours),
      `SAR ${r.otPay.toLocaleString()}`,
      String(r.paidLeaveDays),
      String(r.unpaidLeaveDays),
      String(r.absentDays),
      `-SAR ${(r.leaveDeduction + r.absenceDeduction).toLocaleString()}`,
      `SAR ${r.finalSalary.toLocaleString()}`,
    ]),
    theme: "striped",
    headStyles: REPORT_TABLE_HEAD_STYLE,
    styles: { fontSize: 9, cellPadding: 5 },
    columnStyles: {
      0: { fontStyle: "bold" },
      9: { fontStyle: "bold", halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  drawFooterOnEveryPage(doc, pageWidth);

  doc.save(`PST_Payroll_${periodText.replace(" ", "_")}.pdf`);
}
