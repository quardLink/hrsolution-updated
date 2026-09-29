import { useEffect, useMemo, useState } from "react";
import { UserCheck, UserX, CalendarCheck, CheckCircle2, AlarmClock, CalendarDays, Smartphone } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale } from "@/contexts/LocaleContext";
import { useAdminApi } from "@/contexts/AdminApiContext";
import { getDateKey, minutesLate, parseTimestamp, formatTime as fmtTime } from "../../lib/attendance";
import AttendanceRing from "./AttendanceRing";

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
  onViewChange?: (v: "leave" | "remoteRequests") => void;
}

interface TodayRow {
  employee: Employee;
  firstCheckIn: Date | null;
  lastCheckOut: Date | null;
  late: number;
  onLeave: boolean;
}

function initials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

// Only what Today needs from each — the full shapes live in
// useLeaveRequests.ts / RemoteRequestsTab.tsx.
interface LeaveRequest {
  employeeId: string;
  fromDate: string;
  toDate: string;
  status: string;
}
interface RemoteRequest {
  status: string;
}

function isOnLeave(requests: LeaveRequest[], employeeId: string, dateKey: string): boolean {
  return requests.some((r) => r.employeeId === employeeId && r.status === "approved" && r.fromDate <= dateKey && dateKey <= r.toDate);
}

export default function TodayTab({ logs, employees, onViewChange }: Props) {
  const { t, dict, locale } = useLocale();
  const { baseUrl, onError } = useAdminApi();
  const today = getDateKey(new Date());

  // Fetched independently from the logs/employees this tab already has —
  // same self-contained-per-tab pattern as the rest of the admin app, just
  // enough to turn "Absent" into "Absent vs. on approved leave" and to
  // surface a pending-approvals nudge, without pulling in the full Leave
  // or Remote Requests tab machinery.
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [remoteRequests, setRemoteRequests] = useState<RemoteRequest[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [leaveRes, remoteRes] = await Promise.all([
          fetch(`${baseUrl}/api/admin/leave-requests`, { credentials: "include" }),
          fetch(`${baseUrl}/api/admin/remote-requests`, { credentials: "include" }),
        ]);
        if (!cancelled && leaveRes.ok) setLeaveRequests((await leaveRes.json()).requests ?? []);
        if (!cancelled && remoteRes.ok) setRemoteRequests((await remoteRes.json()).requests ?? []);
      } catch {
        if (!cancelled) onError("Failed to load approvals");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl]);

  const rows: TodayRow[] = useMemo(() => {
    const built = employees.map((emp) => {
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
      return { employee: emp, firstCheckIn, lastCheckOut, late, onLeave: isOnLeave(leaveRequests, emp.id, today) };
    });

    // Whoever punched most recently (a check-out counts as more recent
    // than that same person's check-in) floats to the top, so the front
    // desk can see at a glance who just walked in or out. Employees with
    // no activity yet today have nothing to rank by, so they sink to the
    // bottom, alphabetically among themselves.
    return built.sort((a, b) => {
      const aLast = a.lastCheckOut ?? a.firstCheckIn;
      const bLast = b.lastCheckOut ?? b.firstCheckIn;
      if (aLast && bLast) return bLast.getTime() - aLast.getTime();
      if (aLast) return -1;
      if (bLast) return 1;
      return a.employee.name.localeCompare(b.employee.name);
    });
  }, [logs, employees, today, leaveRequests]);

  const presentCount = rows.filter((r) => r.firstCheckIn).length;
  const onLeaveCount = rows.filter((r) => !r.firstCheckIn && r.onLeave).length;
  const absentCount = rows.length - presentCount - onLeaveCount;
  const onTimeCount = rows.filter((r) => r.firstCheckIn && r.late <= 15).length;
  const lateCount = rows.filter((r) => r.firstCheckIn && r.late > 15).length;
  const pendingLeaveCount = leaveRequests.filter((r) => r.status === "pending").length;
  const pendingRemoteCount = remoteRequests.filter((r) => r.status === "pending").length;

  // Same per-day replay as the table above, run once per day for the last
  // week, purely to draw the stat-card trend lines — real punch history,
  // not a fabricated series.
  const last7 = useMemo(() => {
    const days: { key: string; present: number; absent: number; onLeave: number; onTime: number; late: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = getDateKey(d);
      let present = 0;
      let onLeave = 0;
      let onTime = 0;
      let late = 0;
      for (const emp of employees) {
        let firstCheckIn: Date | null = null;
        for (const log of logs) {
          if (log.employeeId !== emp.id || log.action !== "checkin") continue;
          const ld = parseTimestamp(log.timestamp);
          if (!ld || getDateKey(ld) !== key) continue;
          if (!firstCheckIn || ld < firstCheckIn) firstCheckIn = ld;
        }
        if (firstCheckIn) {
          present++;
          const lateMin =
            emp.reportingMorning && emp.reportingMorning !== "00:00" ? minutesLate(firstCheckIn, emp.reportingMorning) : 0;
          if (lateMin > 15) late++;
          else onTime++;
        } else if (isOnLeave(leaveRequests, emp.id, key)) {
          onLeave++;
        }
      }
      days.push({ key, present, absent: employees.length - present - onLeave, onLeave, onTime, late });
    }
    return days;
  }, [logs, employees, leaveRequests]);

  const todayLabel = new Date().toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  function statusBadge(row: TodayRow) {
    if (!row.firstCheckIn && row.onLeave) {
      return <Badge variant="outline" className="border-transparent bg-primary/10 text-primary">{t("today.onLeave")}</Badge>;
    }
    if (!row.firstCheckIn) {
      return <Badge variant="outline" className="border-transparent bg-red-500/10 text-red-500">{t("today.absent")}</Badge>;
    }
    if (row.late > 15) {
      return <Badge variant="outline" className="border-transparent bg-amber-500/10 text-amber-500">{t("today.late")} {row.late}m</Badge>;
    }
    if (row.late > 0) {
      return <Badge variant="outline" className="border-transparent bg-yellow-500/10 text-yellow-500">+{row.late}m</Badge>;
    }
    return <Badge variant="outline" className="border-transparent bg-emerald-500/10 text-emerald-500">{t("today.onTime")}</Badge>;
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold tracking-tight">{t("today.title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{todayLabel}</p>
        </div>
        {(pendingLeaveCount > 0 || pendingRemoteCount > 0) && (
          <div className="flex flex-wrap items-center gap-2">
            {pendingLeaveCount > 0 && (
              <button
                onClick={() => onViewChange?.("leave")}
                className="flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/15 transition-colors"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                {dict.today.pendingLeave(pendingLeaveCount)}
              </button>
            )}
            {pendingRemoteCount > 0 && (
              <button
                onClick={() => onViewChange?.("remoteRequests")}
                className="flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/15 transition-colors"
              >
                <Smartphone className="w-3.5 h-3.5" />
                {dict.today.pendingRemote(pendingRemoteCount)}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
        <StatCard
          index={0}
          icon={UserCheck}
          label={t("today.present")}
          value={presentCount}
          total={employees.length}
          tone="green"
          series={last7.map((d) => d.present)}
        />
        <StatCard
          index={1}
          icon={UserX}
          label={t("today.absent")}
          value={absentCount}
          total={employees.length}
          tone="pink"
          series={last7.map((d) => d.absent)}
        />
        <StatCard
          index={2}
          icon={CalendarCheck}
          label={t("today.onLeave")}
          value={onLeaveCount}
          total={employees.length}
          tone="purple"
          series={last7.map((d) => d.onLeave)}
        />
        <StatCard
          index={3}
          icon={CheckCircle2}
          label={t("today.onTime")}
          value={onTimeCount}
          total={employees.length}
          tone="blue"
          series={last7.map((d) => d.onTime)}
        />
        <StatCard
          index={4}
          icon={AlarmClock}
          label={t("today.late")}
          value={lateCount}
          total={employees.length}
          tone="yellow"
          series={last7.map((d) => d.late)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 lg:gap-6 items-start">
        <Card className="p-5">
          <CardTitle className="text-sm font-semibold mb-1">{t("today.overview")}</CardTitle>
          <p className="text-xs text-muted-foreground mb-4">{todayLabel}</p>
          <AttendanceRing onTime={onTimeCount} late={lateCount} absent={absentCount} total={onTimeCount + lateCount + absentCount} />
        </Card>

        <Card className="overflow-hidden py-0 gap-0">
          <CardHeader className="flex-row items-center justify-between border-b py-3.5 gap-2">
            <CardTitle className="text-sm font-semibold">{t("today.employees")}</CardTitle>
            <span className="text-xs text-muted-foreground">{rows.length} {t("today.total")}</span>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="ps-5">{t("today.employee")}</TableHead>
                  <TableHead>{t("common.role")}</TableHead>
                  <TableHead>{t("today.expectedBy")}</TableHead>
                  <TableHead>{t("today.checkIn")}</TableHead>
                  <TableHead>{t("today.checkOut")}</TableHead>
                  <TableHead className="pe-5">{t("common.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.employee.id}>
                    <TableCell className="ps-5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs shrink-0 ${
                            r.firstCheckIn ? "bg-primary" : "bg-muted-foreground/40"
                          }`}
                        >
                          {initials(r.employee.name)}
                        </div>
                        <div>
                          <div className="font-medium">{r.employee.name}</div>
                          <div className="text-xs text-muted-foreground">{r.employee.id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground/80 capitalize">
                      {(r.employee.role ?? "—").toString().replace("_", " ")}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {r.employee.reportingMorning ?? "—"}
                    </TableCell>
                    <TableCell className="text-foreground/80 font-mono">
                      {r.firstCheckIn ? fmtTime(r.firstCheckIn) : "—"}
                    </TableCell>
                    <TableCell className="text-foreground/80 font-mono">
                      {r.lastCheckOut ? fmtTime(r.lastCheckOut) : "—"}
                    </TableCell>
                    <TableCell className="pe-5">{statusBadge(r)}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      {t("today.noEmployees")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  index,
  icon: Icon,
  label,
  value,
  total,
  tone,
  series,
}: {
  index: number;
  icon: typeof UserCheck;
  label: string;
  value: number;
  total: number;
  tone: "green" | "pink" | "purple" | "blue" | "yellow";
  series: number[];
}) {
  // The card itself is a uniform glass tile now (see Card); each metric
  // keeps its own identity only in the icon chip and trend line color,
  // rather than tinting the whole card as it did before. "purple" reuses
  // the brand accent directly (on-leave doesn't have its own block-*
  // token) rather than adding a 5th one for a single stat.
  const toneMap = {
    green: { chip: "bg-block-green text-block-green-foreground", line: "text-emerald-500" },
    pink: { chip: "bg-block-pink text-block-pink-foreground", line: "text-pink-500" },
    purple: { chip: "bg-primary/15 text-primary", line: "text-primary" },
    blue: { chip: "bg-block-blue text-block-blue-foreground", line: "text-blue-500" },
    yellow: { chip: "bg-block-yellow text-block-yellow-foreground", line: "text-amber-500" },
  };
  const data = series.map((v, i) => ({ i, value: v }));
  const gradId = `spark-${tone}`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: "easeOut" }}
    >
        <Card className="p-4 gap-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground truncate">{label}</span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${toneMap[tone].chip}`}>
              <Icon className="w-4 h-4" strokeWidth={2.25} />
            </div>
          </div>
          <div className="flex items-baseline gap-1 mt-3">
            <span className="text-2xl lg:text-3xl font-bold tabular-nums">{value}</span>
            <span className="text-xs font-medium text-muted-foreground">/ {total}</span>
          </div>
          <div className={`mt-2 -mx-1 h-10 w-full ${toneMap[tone].line}`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="currentColor"
                  strokeWidth={2}
                  fill={`url(#${gradId})`}
                  isAnimationActive={false}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
    </motion.div>
  );
}
