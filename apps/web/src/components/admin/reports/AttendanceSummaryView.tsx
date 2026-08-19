import { formatDate, formatTime } from "../../../lib/attendance";
import type { DaySummary } from "../../../hooks/useAttendanceAnalytics";

interface Props {
  summary: DaySummary[];
  loading: boolean;
}

export default function AttendanceSummaryView({ summary, loading }: Props) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <h2 className="font-semibold text-foreground">Daily Attendance Summary</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{summary.length} record(s)</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase text-muted-foreground bg-muted/30 border-b border-border">
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
              <tr key={i} className={`border-b border-border/60 hover:bg-muted/30 ${s.hasAnomaly ? "bg-amber-500/5" : ""}`}>
                <td className="px-4 py-3 text-foreground font-medium">{formatDate(s.dateObj)}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{s.employeeName}</div>
                  <div className="text-xs text-muted-foreground">{s.employeeId}</div>
                </td>
                <td className="px-4 py-3 text-foreground/80">
                  {s.firstCheckIn ? formatTime(s.firstCheckIn) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 text-foreground/80">
                  {s.lastCheckOut ? formatTime(s.lastCheckOut) : <span className="text-red-400 font-medium">Missing</span>}
                </td>
                <td className="px-4 py-3 text-foreground/80">
                  {s.totalHours > 0 ? `${s.totalHours.toFixed(1)} h` : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3">
                  {s.minutesLate > 0 ? (
                    <span className="text-amber-400 font-medium">{s.minutesLate}m</span>
                  ) : s.firstCheckIn ? (
                    <span className="text-emerald-400 font-medium">On time</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {s.hasAnomaly ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400">
                      ⚠ {s.anomalyReason}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400">
                      ✓ Complete
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {summary.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
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
