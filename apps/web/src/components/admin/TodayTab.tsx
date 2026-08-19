import { useMemo } from "react";
import { getDateKey, minutesLate, parseTimestamp, formatTime as fmtTime } from "../../lib/attendance";

interface LogEntry {
  timestamp: string;
  employeeName: string;
  employeeId: string;
  session: string;
  action: string;
}

interface Employee {
  id: string;
  name: string;
  role?: string;
  reportingMorning?: string;
}

interface Props {
  logs: LogEntry[];
  employees: Employee[];
}

interface TodayRow {
  employee: Employee;
  firstCheckIn: Date | null;
  lastCheckOut: Date | null;
  late: number;
}

export default function TodayTab({ logs, employees }: Props) {
  const today = getDateKey(new Date());

  const rows: TodayRow[] = useMemo(() => {
    return employees.map((emp) => {
      let firstCheckIn: Date | null = null;
      let lastCheckOut: Date | null = null;
      for (const log of logs) {
        if (log.employeeId !== emp.id) continue;
        const d = parseTimestamp(log.timestamp);
        if (!d || getDateKey(d) !== today) continue;
        if (log.action === "checkin") {
          if (!firstCheckIn || d < firstCheckIn) firstCheckIn = d;
        } else if (log.action === "checkout") {
          if (!lastCheckOut || d > lastCheckOut) lastCheckOut = d;
        }
      }
      const late = firstCheckIn && emp.reportingMorning && emp.reportingMorning !== "00:00"
        ? minutesLate(firstCheckIn, emp.reportingMorning)
        : 0;
      return { employee: emp, firstCheckIn, lastCheckOut, late };
    });
  }, [logs, employees, today]);

  const presentCount = rows.filter((r) => r.firstCheckIn).length;
  const absentCount = rows.length - presentCount;
  const onTimeCount = rows.filter((r) => r.firstCheckIn && r.late <= 15).length;
  const lateCount = rows.filter((r) => r.firstCheckIn && r.late > 15).length;

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  function statusBadge(row: TodayRow) {
    if (!row.firstCheckIn) {
      return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-400">Absent</span>;
    }
    if (row.late > 15) {
      return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400">Late {row.late}m</span>;
    }
    if (row.late > 0) {
      return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/15 text-yellow-400">+{row.late}m</span>;
    }
    return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400">On time</span>;
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg lg:text-xl font-bold text-foreground">Today's Attendance</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{todayLabel}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Present" value={presentCount} total={employees.length} color="emerald" />
        <StatCard label="Absent" value={absentCount} total={employees.length} color="red" />
        <StatCard label="On Time" value={onTimeCount} total={employees.length} color="indigo" />
        <StatCard label="Late" value={lateCount} total={employees.length} color="amber" />
      </div>

      {/* Employee list — table on desktop, cards on mobile */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 lg:px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground text-sm lg:text-base">Employees</h3>
          <span className="text-xs text-muted-foreground">{rows.length} total</span>
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden divide-y divide-border">
          {rows.map((r) => (
            <div key={r.employee.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${
                  r.firstCheckIn ? "bg-gradient-to-br from-indigo-500 to-violet-600" : "bg-muted"
                }`}>
                  {r.employee.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-foreground text-sm truncate">{r.employee.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.firstCheckIn ? `In ${fmtTime(r.firstCheckIn)}` : "Not checked in"}
                    {r.lastCheckOut ? ` · Out ${fmtTime(r.lastCheckOut)}` : ""}
                  </div>
                </div>
              </div>
              {statusBadge(r)}
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase text-muted-foreground bg-muted/30 border-b border-border">
                <th className="px-5 py-3 text-left">Employee</th>
                <th className="px-5 py-3 text-left">Role</th>
                <th className="px-5 py-3 text-left">Expected By</th>
                <th className="px-5 py-3 text-left">Check In</th>
                <th className="px-5 py-3 text-left">Check Out</th>
                <th className="px-5 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.employee.id} className="border-b border-border/60 hover:bg-muted/30">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${
                        r.firstCheckIn ? "bg-gradient-to-br from-indigo-500 to-violet-600" : "bg-muted"
                      }`}>
                        {r.employee.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{r.employee.name}</div>
                        <div className="text-xs text-muted-foreground">{r.employee.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-foreground/80 capitalize">
                    {(r.employee.role ?? "—").toString().replace("_", " ")}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground font-mono text-xs">
                    {r.employee.reportingMorning ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-foreground/80 font-mono">
                    {r.firstCheckIn ? fmtTime(r.firstCheckIn) : "—"}
                  </td>
                  <td className="px-5 py-3 text-foreground/80 font-mono">
                    {r.lastCheckOut ? fmtTime(r.lastCheckOut) : "—"}
                  </td>
                  <td className="px-5 py-3">{statusBadge(r)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    No employees configured
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: "emerald" | "red" | "indigo" | "amber";
}) {
  const colorMap = {
    emerald: "from-emerald-600 to-emerald-700",
    red: "from-red-600 to-red-700",
    indigo: "from-indigo-600 to-violet-700",
    amber: "from-amber-600 to-amber-700",
  };
  return (
    <div className={`rounded-xl bg-gradient-to-br p-3 lg:p-4 text-white shadow-lg ${colorMap[color]}`}>
      <div className="text-xs lg:text-sm font-medium opacity-80">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <div className="text-2xl lg:text-3xl font-bold">{value}</div>
        <div className="text-xs lg:text-sm opacity-70">/ {total}</div>
      </div>
    </div>
  );
}
