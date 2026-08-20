import { useMemo } from "react";
import { UserCheck, UserX, CheckCircle2, AlarmClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale } from "@/contexts/LocaleContext";
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

function initials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function TodayTab({ logs, employees }: Props) {
  const { t, locale } = useLocale();
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

  const todayLabel = new Date().toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  function statusBadge(row: TodayRow) {
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
      <div>
        <h1 className="text-xl lg:text-2xl font-semibold tracking-tight">{t("today.title")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{todayLabel}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard icon={UserCheck} label={t("today.present")} value={presentCount} total={employees.length} tone="emerald" />
        <StatCard icon={UserX} label={t("today.absent")} value={absentCount} total={employees.length} tone="red" />
        <StatCard icon={CheckCircle2} label={t("today.onTime")} value={onTimeCount} total={employees.length} tone="primary" />
        <StatCard icon={AlarmClock} label={t("today.late")} value={lateCount} total={employees.length} tone="amber" />
      </div>

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
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  total,
  tone,
}: {
  icon: typeof UserCheck;
  label: string;
  value: number;
  total: number;
  tone: "emerald" | "red" | "primary" | "amber";
}) {
  const toneMap = {
    emerald: "bg-emerald-500/10 text-emerald-500",
    red: "bg-red-500/10 text-red-500",
    primary: "bg-primary/10 text-primary",
    amber: "bg-amber-500/10 text-amber-500",
  };
  return (
    <Card className="p-4 gap-0">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${toneMap[tone]}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground truncate">{label}</div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl lg:text-2xl font-semibold tabular-nums">{value}</span>
            <span className="text-xs text-muted-foreground">/ {total}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
