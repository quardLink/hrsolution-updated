import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/contexts/LocaleContext";
import { formatDate, formatTime } from "../../../lib/attendance";
import { AUTH_LABEL_KEYS } from "../../../lib/attendanceAuth";
import type { DaySummary, DayStatus } from "../../../hooks/useAttendanceAnalytics";
import type { LogEntry } from "../../../hooks/useAdminAuth";
import type { TranslationKey } from "../../../lib/i18n";
import LogTrailDialog from "./LogTrailDialog";

const STATUS_META: Record<DayStatus, { labelKey: TranslationKey; className: string }> = {
  present: { labelKey: "reports.statusPresent", className: "bg-emerald-500/10 text-emerald-500" },
  late: { labelKey: "reports.statusLate", className: "bg-amber-500/10 text-amber-500" },
  early_leave: { labelKey: "reports.statusEarlyLeave", className: "bg-amber-500/10 text-amber-500" },
  missing_checkout: { labelKey: "reports.statusMissingCheckout", className: "bg-destructive/10 text-destructive" },
  weekend: { labelKey: "reports.statusWeekend", className: "bg-muted text-muted-foreground" },
  unbalanced: { labelKey: "reports.statusUnbalanced", className: "bg-destructive/10 text-destructive" },
};

interface Props {
  summary: DaySummary[];
  logs: LogEntry[];
  loading: boolean;
}

// Alternates a subtle accent across successive date groups, purely so
// consecutive days are easy to tell apart at a glance when scanning down
// the page — kept to a thin border-and-dot rather than a solid banner so
// it doesn't compete with the rest of the app's restrained palette.
const THEMES = [
  { border: "border-s-blue-400", dot: "bg-blue-400" },
  { border: "border-s-emerald-400", dot: "bg-emerald-400" },
];

export default function AttendanceSummaryView({ summary, logs, loading }: Props) {
  const { t } = useLocale();
  const [trailFor, setTrailFor] = useState<{ employeeId: string; employeeName: string } | null>(null);

  // `summary` already sorts newest-date-first, then by employee name —
  // grouping just needs to walk it once and split on date changes.
  const groups = useMemo(() => {
    const list: { date: string; dateObj: Date; rows: DaySummary[] }[] = [];
    for (const s of summary) {
      const last = list[list.length - 1];
      if (last && last.date === s.date) {
        last.rows.push(s);
      } else {
        list.push({ date: s.date, dateObj: s.dateObj, rows: [s] });
      }
    }
    return list;
  }, [summary]);

  // The trail dialog is intentionally rendered unconditionally below,
  // outside this early return — it shows one employee's full history
  // regardless of the outer Records filters, so it must stay mounted
  // even if those filters narrow the visible groups to zero.
  const noResults = !loading && groups.length === 0;

  // Same groups the cards below render, just re-ordered oldest-first and
  // reduced to per-day counts — a real trend from the filtered records,
  // not a separately-fetched or invented series.
  const trend = useMemo(
    () =>
      groups
        .slice()
        .reverse()
        .map((g) => ({
          date: g.dateObj,
          present: g.rows.filter((r) => r.status !== "missing_checkout" && r.status !== "unbalanced").length,
          late: g.rows.filter((r) => r.status === "late").length,
        })),
    [groups],
  );

  return (
    <>
      {noResults ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">{t("reports.noRecordsFiltered")}</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {trend.length > 1 && <AttendanceTrendChart trend={trend} />}
          {groups.map((group, i) => (
            <DateGroupCard
              key={group.date}
              dateObj={group.dateObj}
              rows={group.rows}
              theme={THEMES[i % THEMES.length]}
              onOpenTrail={(employeeId, employeeName) => setTrailFor({ employeeId, employeeName })}
            />
          ))}
        </div>
      )}
      <LogTrailDialog
        open={trailFor !== null}
        onOpenChange={(open) => !open && setTrailFor(null)}
        employeeId={trailFor?.employeeId ?? null}
        employeeName={trailFor?.employeeName ?? ""}
        logs={logs}
      />
    </>
  );
}

function AttendanceTrendChart({ trend }: { trend: { date: Date; present: number; late: number }[] }) {
  const { t } = useLocale();
  const data = trend.map((d) => ({
    label: d.date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    present: d.present,
    late: d.late,
  }));
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{t("reports.trendTitle")}</CardTitle>
        <CardDescription>{t("reports.trendSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="h-56 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--popover-border))",
                borderRadius: 12,
                fontSize: 12,
              }}
              cursor={{ fill: "hsl(var(--accent) / 0.08)" }}
            />
            <Bar dataKey="present" name={t("reports.trendPresent")} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="late" name={t("reports.trendLate")} fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function DateGroupCard({
  dateObj,
  rows,
  theme,
  onOpenTrail,
}: {
  dateObj: Date;
  rows: DaySummary[];
  theme: (typeof THEMES)[number];
  onOpenTrail: (employeeId: string, employeeName: string) => void;
}) {
  const { t } = useLocale();

  function authSubline(authType: string | null, deviceName: string | null): string | null {
    if (!authType) return null;
    const label = t(AUTH_LABEL_KEYS[authType] ?? "reports.authPin");
    return deviceName ? `${label} · ${deviceName}` : label;
  }

  function statusBadge(s: DaySummary) {
    return s.status === "unbalanced" ? (
      <Badge variant="outline" className="border-transparent bg-destructive/10 text-destructive">
        ⚠ {s.anomalyReason}
      </Badge>
    ) : (
      <Badge variant="outline" className={`border-transparent ${STATUS_META[s.status].className}`}>
        {t(STATUS_META[s.status].labelKey)}
      </Badge>
    );
  }

  return (
    <Card className={`overflow-hidden py-0 gap-0 border-s-4 ${theme.border}`}>
      <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 py-3.5 border-b">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${theme.dot}`} />
          <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="font-semibold text-sm whitespace-nowrap">{formatDate(dateObj)}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="border-transparent bg-muted text-muted-foreground">
            {t("reports.summaryBadge")}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {rows.length} {t("reports.employeesLabel")}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Table for md+ screens — below that, a card list avoids the
            horizontal scroll a 9-column table forces on a phone. */}
        {/* table-fixed + explicit widths on every header cell — each date
            group is its own independent <table>, so without this, the
            browser auto-sizes each one's columns from that day's own
            content widths (a day with a recorded break widens the Break
            column) and nothing lines up card-to-card down the page. */}
        <Table className="hidden md:table table-fixed">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="ps-5 w-10">#</TableHead>
              <TableHead className="w-36">{t("reports.colDate")}</TableHead>
              <TableHead className="w-40 md:sticky md:left-0 md:bg-card md:z-10">{t("reports.colEmployee")}</TableHead>
              <TableHead className="w-32">{t("reports.colFirstCheckIn")}</TableHead>
              <TableHead className="w-32">{t("reports.colLastCheckOut")}</TableHead>
              <TableHead className="w-44">{t("reports.colBreak")}</TableHead>
              <TableHead className="w-16">{t("reports.colHours")}</TableHead>
              <TableHead className="w-16">{t("reports.colLate")}</TableHead>
              <TableHead className="pe-5">{t("common.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s, i) => (
              <TableRow key={`${s.date}_${s.employeeId}`} className={s.hasAnomaly ? "bg-amber-500/5" : ""}>
                <TableCell className="ps-5 text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="font-medium">{formatDate(s.dateObj)}</TableCell>
                <TableCell className="md:sticky md:left-0 md:bg-card md:z-10">
                  <button
                    type="button"
                    onClick={() => onOpenTrail(s.employeeId, s.employeeName)}
                    className="font-medium hover:underline underline-offset-2 text-start"
                  >
                    {s.employeeName}
                  </button>
                  <div className="text-xs text-muted-foreground">{s.employeeId}</div>
                </TableCell>
                <TableCell className="text-foreground/80">
                  {s.firstCheckIn ? (
                    <>
                      <div>{formatTime(s.firstCheckIn)}</div>
                      <div className="text-xs text-muted-foreground/70">
                        {authSubline(s.firstCheckInAuthType, s.firstCheckInDevice)}
                      </div>
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-foreground/80">
                  {s.lastCheckOut ? (
                    <>
                      <div>{formatTime(s.lastCheckOut)}</div>
                      <div className="text-xs text-muted-foreground/70">
                        {authSubline(s.lastCheckOutAuthType, s.lastCheckOutDevice)}
                      </div>
                    </>
                  ) : (
                    <span className="text-red-500 font-medium">{t("reports.missing")}</span>
                  )}
                </TableCell>
                <TableCell className="text-foreground/80">
                  {s.breaks.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <div className="space-y-0.5">
                      {s.breaks.map((b, bi) => {
                        const minutes = Math.round((b.end.getTime() - b.start.getTime()) / 60000);
                        return (
                          <div key={bi} className="text-xs whitespace-nowrap">
                            {formatTime(b.start)}–{formatTime(b.end)}{" "}
                            <span className="text-muted-foreground">({minutes}m)</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-foreground/80">
                  {s.totalHours > 0 ? `${s.totalHours.toFixed(1)} h` : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  {s.minutesLate > 0 ? (
                    <span className="text-amber-500 font-medium">{s.minutesLate}m</span>
                  ) : s.firstCheckIn ? (
                    <span className="text-emerald-500 font-medium">{t("reports.onTime")}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="pe-5">{statusBadge(s)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Card list for phones. */}
        <div className="md:hidden divide-y">
          {rows.map((s) => (
            <div key={`${s.date}_${s.employeeId}`} className={`p-4 space-y-3 ${s.hasAnomaly ? "bg-amber-500/5" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <button
                    type="button"
                    onClick={() => onOpenTrail(s.employeeId, s.employeeName)}
                    className="font-medium hover:underline underline-offset-2 text-start"
                  >
                    {s.employeeName}
                  </button>
                  <div className="text-xs text-muted-foreground">{s.employeeId}</div>
                </div>
                {statusBadge(s)}
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">{t("reports.colFirstCheckIn")}</div>
                  {s.firstCheckIn ? (
                    <>
                      <div>{formatTime(s.firstCheckIn)}</div>
                      <div className="text-xs text-muted-foreground/70">
                        {authSubline(s.firstCheckInAuthType, s.firstCheckInDevice)}
                      </div>
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t("reports.colLastCheckOut")}</div>
                  {s.lastCheckOut ? (
                    <>
                      <div>{formatTime(s.lastCheckOut)}</div>
                      <div className="text-xs text-muted-foreground/70">
                        {authSubline(s.lastCheckOutAuthType, s.lastCheckOutDevice)}
                      </div>
                    </>
                  ) : (
                    <span className="text-red-500 font-medium">{t("reports.missing")}</span>
                  )}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t("reports.colBreak")}</div>
                  {s.breaks.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    s.breaks.map((b, bi) => {
                      const minutes = Math.round((b.end.getTime() - b.start.getTime()) / 60000);
                      return (
                        <div key={bi} className="text-xs whitespace-nowrap">
                          {formatTime(b.start)}–{formatTime(b.end)} <span className="text-muted-foreground">({minutes}m)</span>
                        </div>
                      );
                    })
                  )}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t("reports.colHours")}</div>
                  {s.totalHours > 0 ? `${s.totalHours.toFixed(1)} h` : <span className="text-muted-foreground">—</span>}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t("reports.colLate")}</div>
                  {s.minutesLate > 0 ? (
                    <span className="text-amber-500 font-medium">{s.minutesLate}m</span>
                  ) : s.firstCheckIn ? (
                    <span className="text-emerald-500 font-medium">{t("reports.onTime")}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
