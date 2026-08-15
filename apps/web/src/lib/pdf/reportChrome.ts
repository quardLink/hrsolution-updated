import type jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Shared jsPDF boilerplate factored out of the attendance and payroll report
// builders, which both drew the same dark header banner, footer-on-every-page,
// section-title, and label/value metrics-grid — just with different sizes.

export const REPORT_TABLE_HEAD_STYLE = { fillColor: [30, 58, 95] as [number, number, number], textColor: 255, fontSize: 9 };

export interface ReportBannerLine {
  text: string;
  y: number;
}

export interface ReportBannerOptions {
  pageWidth: number;
  margin: number;
  bannerHeight: number;
  titleY: number;
  subtitleY: number;
  subtitle: string;
  detailLines: ReportBannerLine[];
}

export function drawReportBanner(doc: jsPDF, opts: ReportBannerOptions): void {
  const { pageWidth, margin, bannerHeight, titleY, subtitleY, subtitle, detailLines } = opts;
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, bannerHeight, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("PETRO SAFE TECH", margin, titleY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(180, 200, 230);
  doc.text(subtitle, margin, subtitleY);
  doc.setFontSize(9);
  for (const line of detailLines) {
    doc.text(line.text, margin, line.y);
  }
}

export function drawFooterOnEveryPage(doc: jsPDF, pageWidth: number): void {
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
}

export function drawSectionTitle(
  doc: jsPDF,
  pageWidth: number,
  margin: number,
  y: number,
  title: string,
  spacingAfterLine = 12,
): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text(title, margin, y);
  y += 6;
  doc.setDrawColor(220);
  doc.line(margin, y, pageWidth - margin, y);
  return y + spacingAfterLine;
}

export function getAutoTableFinalY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

export function drawMetricsTable(
  doc: jsPDF,
  { startY, margin, rows }: { startY: number; margin: number; rows: (string | number)[][] },
): number {
  const numCols = rows[0]?.length ?? 0;
  const columnStyles: Record<number, { fontStyle: "bold"; fillColor: [number, number, number] }> = {};
  for (let c = 0; c < numCols; c += 2) {
    columnStyles[c] = { fontStyle: "bold", fillColor: [241, 245, 249] };
  }
  autoTable(doc, {
    startY,
    head: [],
    body: rows.map((r) => r.map(String)),
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 6, textColor: [40, 40, 40] },
    columnStyles,
    margin: { left: margin, right: margin },
  });
  return getAutoTableFinalY(doc) + 24;
}
