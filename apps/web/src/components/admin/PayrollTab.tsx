import { useState, useEffect } from "react";
import { useAdminApi } from "../../contexts/AdminApiContext";
import { exportPayrollReportPdf, type PayrollResult } from "../../lib/pdf/payrollReport";

const now = new Date();

export default function PayrollTab() {
  const { baseUrl, onError } = useAdminApi();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [results, setResults] = useState<PayrollResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  async function runPayroll() {
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/payroll-summary?year=${year}&month=${month}`, {
        credentials: "include",
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
  const missingSalary = results.filter((r) => r.baseSalary === 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg lg:text-xl font-bold text-foreground">Payroll</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Run monthly payroll off attendance and leave records.</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Year</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-24 px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Month</label>
          <input
            type="number"
            min={1}
            max={12}
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-20 px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <button
          onClick={runPayroll}
          disabled={loading}
          className="bg-primary hover:opacity-90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Calculating..." : "Run Payroll"}
        </button>
        {hasRun && results.length > 0 && (
          <button
            onClick={() => exportPayrollReportPdf({ year, month, results })}
            className="bg-secondary border border-secondary-border text-secondary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted"
          >
            Export PDF
          </button>
        )}
      </div>

      {missingSalary.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm rounded-lg p-3">
          {missingSalary.length} employee{missingSalary.length > 1 ? "s have" : " has"} no monthly
          salary set ({missingSalary.map((r) => r.employeeName).join(", ")}) — their payroll will
          show as SAR 0 until you set it in the Employees tab.
        </div>
      )}

      {hasRun && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">Total payout</p>
              <p className="text-xl font-semibold text-foreground">
                SAR {totalPayout.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">Total OT cost</p>
              <p className="text-xl font-semibold text-foreground">
                SAR {totalOtCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
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
                  <tr key={r.employeeId} className="border-b border-border/60 last:border-0">
                    <td className="p-3 font-medium text-foreground">{r.employeeName}</td>
                    <td className="p-3 text-foreground/80">{r.totalWorkedHours}</td>
                    <td className="p-3 text-foreground/80">{r.totalOtHours}</td>
                    <td className="p-3 text-foreground/80">{r.otPay.toLocaleString()}</td>
                    <td className="p-3 text-foreground/80">{r.paidLeaveDays} / {r.unpaidLeaveDays}</td>
                    <td className="p-3 text-foreground/80">{r.absentDays}</td>
                    <td className="p-3 text-red-400">-{(r.leaveDeduction + r.absenceDeduction).toLocaleString()}</td>
                    <td className="p-3 font-semibold text-foreground">
                      SAR {r.finalSalary.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground/70">
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
