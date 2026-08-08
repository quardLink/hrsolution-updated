import { useState, useEffect } from "react";

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
  baseSalary: number;
  finalSalary: number;
}

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
  const missingSalary = results.filter((r) => r.baseSalary === 0);

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
                    <td className="p-3 text-red-600">-{r.leaveDeduction.toLocaleString()}</td>
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
            emergency, other.
          </p>
        </>
      )}
    </div>
  );
}
