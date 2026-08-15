import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PayrollResult {
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

interface Props {
  password: string;
  baseUrl: string;
  onError: (msg: string) => void;
}

const now = new Date();

export default function PayrollTab({ password, baseUrl, onError }: Props) {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [results, setResults] = useState<PayrollResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  async function runPayroll() {
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/payroll-summary?year=${year}&month=${month}`, {
        headers: { "x-admin-password": password },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        onError(data.error || "Failed to calculate payroll");
        return;
      }
      const data = await res.json();
      setResults(data.results ?? []);
      setHasRun(true);
    } catch {
      onError("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runPayroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPayout = results.reduce((sum, r) => sum + r.finalSalary, 0);
  const totalOtCost = results.reduce((sum, r) => sum + r.otPay, 0);
  const totalDeductions = results.reduce((sum, r) => sum + r.leaveDeduction + r.absenceDeduction, 0);
  const missingSalary = results.filter((r) => r.baseSalary === 0);

  function exportPdf() {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;
    const periodText = `${MONTH_NAMES[month - 1]} ${year}`;
    const generated = new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 90, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("PETRO SAFE TECH", margin, 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(180, 200, 230);
    doc.text(`Payroll Report — ${periodText}`, margin, 62);
    doc.setFontSize(9);
    doc.text(`Generated: ${generated}`, margin, 78);

    let y = 120;
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Summary", margin, y);
    y += 6;
    doc.setDrawColor(220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 18;

    autoTable(doc, {
      startY: y,
      head: [],
      body: [
        [
          "Employees", String(results.length),
          "Total Payout", `SAR ${totalPayout.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
          "Total OT Cost", `SAR ${totalOtCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
          "Total Deductions", `SAR ${totalDeductions.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
        ],
      ],
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 6, textColor: [40, 40, 40] },
      columnStyles: {
        0: { fontStyle: "bold", fillColor: [241, 245, 249] },
        2: { fontStyle: "bold", fillColor: [241, 245, 249] },
        4: { fontStyle: "bold", fillColor: [241, 245, 249] },
        6: { fontStyle: "bold", fillColor: [241, 245, 249] },
      },
      margin: { left: margin, right: margin },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text("Employee Payroll Detail", margin, y);
    y += 6;
    doc.line(margin, y, pageWidth - margin, y);
    y += 12;

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
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 5 },
      columnStyles: {
        0: { fontStyle: "bold" },
        9: { fontStyle: "bold", halign: "right" },
      },
      margin: { left: margin, right: margin },
    });

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

    doc.save(`PST_Payroll_${periodText.replace(" ", "_")}.pdf`);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Month</label>
          <input
            type="number"
            min={1}
            max={12}
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <button
          onClick={runPayroll}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Calculating..." : "Run Payroll"}
        </button>
        {hasRun && results.length > 0 && (
          <button
            onClick={exportPdf}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Export PDF
          </button>
        )}
      </div>

      {missingSalary.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-3">
          {missingSalary.length} employee{missingSalary.length > 1 ? "s have" : " has"} no monthly
          salary set ({missingSalary.map((r) => r.employeeName).join(", ")}) — their payroll will
          show as SAR 0 until you set it in the Employees tab.
        </div>
      )}

      {hasRun && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Total payout</p>
              <p className="text-xl font-semibold text-gray-900">
                SAR {totalPayout.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Total OT cost</p>
              <p className="text-xl font-semibold text-gray-900">
                SAR {totalOtCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="p-3 font-medium">Employee</th>
                  <th className="p-3 font-medium">Worked hrs</th>
                  <th className="p-3 font-medium">OT hrs</th>
                  <th className="p-3 font-medium">OT pay</th>
                  <th className="p-3 font-medium">Leave (paid/unpaid)</th>
                  <th className="p-3 font-medium">Absent days</th>
                  <th className="p-3 font-medium">Deduction</th>
                  <th className="p-3 font-medium">Final salary</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.employeeId} className="border-b border-gray-50 last:border-0">
                    <td className="p-3 font-medium text-gray-900">{r.employeeName}</td>
                    <td className="p-3 text-gray-700">{r.totalWorkedHours}</td>
                    <td className="p-3 text-gray-700">{r.totalOtHours}</td>
                    <td className="p-3 text-gray-700">{r.otPay.toLocaleString()}</td>
                    <td className="p-3 text-gray-700">{r.paidLeaveDays} / {r.unpaidLeaveDays}</td>
                    <td className="p-3 text-gray-700">{r.absentDays}</td>
                    <td className="p-3 text-red-600">-{(r.leaveDeduction + r.absenceDeduction).toLocaleString()}</td>
                    <td className="p-3 font-semibold text-gray-900">
                      SAR {r.finalSalary.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400">
            Worked hours assume the employee's scheduled break was taken (the kiosk currently
            logs only one check-in and one check-out per day). Overtime on the weekly off day
            counts the entire session as OT. Paid leave = sick/annual; unpaid leave = unpaid,
            emergency, other. Absent days = elapsed working days with no attendance log and no
            approved leave request, deducted at the daily rate.
          </p>
        </>
      )}
    </div>
  );
}
