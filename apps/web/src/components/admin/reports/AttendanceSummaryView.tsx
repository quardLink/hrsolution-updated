import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/contexts/LocaleContext";
import { formatDate, formatTime } from "../../../lib/attendance";
import type { DaySummary } from "../../../hooks/useAttendanceAnalytics";

interface Props {
  summary: DaySummary[];
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

export default function AttendanceSummaryView({ summary, loading }: Props) {
  const { t } = useLocale();

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

  if (!loading && groups.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12 text-muted-foreground">{t("reports.noRecordsFiltered")}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group, i) => (
        <DateGroupCard key={group.date} dateObj={group.dateObj} rows={group.rows} theme={THEMES[i % THEMES.length]} />
      ))}
    </div>
  );
}

function DateGroupCard({
  dateObj,
  rows,
  theme,
}: {
  dateObj: Date;
  rows: DaySummary[];
  theme: (typeof THEMES)[number];
}) {
  const { t } = useLocale();
  return (
    <Card className={`overflow-hidden py-0 gap-0 border-s-4 ${theme.border}`}>
      <CardHeader className="flex-row items-center justify-between gap-3 py-3.5 border-b">
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full shrink-0 ${theme.dot}`} />
          <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="font-semibold text-sm">{formatDate(dateObj)}</span>
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
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="ps-5">#</TableHead>
              <TableHead>{t("reports.colDate")}</TableHead>
              <TableHead>{t("reports.colEmployee")}</TableHead>
              <TableHead>{t("reports.colFirstCheckIn")}</TableHead>
              <TableHead>{t("reports.colLastCheckOut")}</TableHead>
              <TableHead>{t("reports.colHours")}</TableHead>
              <TableHead>{t("reports.colLate")}</TableHead>
              <TableHead className="pe-5">{t("common.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s, i) => (
              <TableRow key={`${s.date}_${s.employeeId}`} className={s.hasAnomaly ? "bg-amber-500/5" : ""}>
                <TableCell className="ps-5 text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="font-medium">{formatDate(s.dateObj)}</TableCell>
                <TableCell>
                  <div className="font-medium">{s.employeeName}</div>
                  <div className="text-xs text-muted-foreground">{s.employeeId}</div>
                </TableCell>
                <TableCell className="text-foreground/80">
                  {s.firstCheckIn ? formatTime(s.firstCheckIn) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-foreground/80">
                  {s.lastCheckOut ? formatTime(s.lastCheckOut) : <span className="text-red-500 font-medium">{t("reports.missing")}</span>}
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
                <TableCell className="pe-5">
                  {s.hasAnomaly ? (
                    <Badge variant="outline" className="border-transparent bg-amber-500/10 text-amber-500">⚠ {s.anomalyReason}</Badge>
                  ) : (
                    <Badge variant="outline" className="border-transparent bg-emerald-500/10 text-emerald-500">✓ {t("reports.complete")}</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
