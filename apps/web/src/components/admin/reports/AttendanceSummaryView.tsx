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

export default function AttendanceSummaryView({ summary, loading }: Props) {
  const { t } = useLocale();
  return (
    <Card className="overflow-hidden py-0 gap-0">
      <CardHeader className="border-b py-3.5">
        <div className="font-semibold text-sm">{t("reports.summaryTitle")}</div>
        <p className="text-xs text-muted-foreground mt-0.5">{summary.length} {t("reports.records")}</p>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="ps-5">{t("reports.colDate")}</TableHead>
              <TableHead>{t("reports.colEmployee")}</TableHead>
              <TableHead>{t("reports.colFirstCheckIn")}</TableHead>
              <TableHead>{t("reports.colLastCheckOut")}</TableHead>
              <TableHead>{t("reports.colHours")}</TableHead>
              <TableHead>{t("reports.colLate")}</TableHead>
              <TableHead className="pe-5">{t("common.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.map((s, i) => (
              <TableRow key={i} className={s.hasAnomaly ? "bg-amber-500/5" : ""}>
                <TableCell className="ps-5 font-medium">{formatDate(s.dateObj)}</TableCell>
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
            {summary.length === 0 && !loading && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  {t("reports.noRecordsFiltered")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
