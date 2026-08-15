import { formatDate, formatTime } from "../../../lib/attendance";
import type { DaySummary } from "../../../hooks/useAttendanceAnalytics";

interface Props {
  summary: DaySummary[];
  loading: boolean;
}

export default function AttendanceSummaryView({ summary, loading }: Props) {
  return (
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
  );
}
