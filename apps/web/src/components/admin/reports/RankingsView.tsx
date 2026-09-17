import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale } from "@/contexts/LocaleContext";
import type { EmployeeRanking } from "../../../hooks/useAttendanceAnalytics";
import ScoreBar from "./ScoreBar";
import GradeBadge from "./GradeBadge";
import RankingsChart from "./RankingsChart";

interface Props {
  rankings: EmployeeRanking[];
  totalDaysInPeriod: number;
}

export default function RankingsView({ rankings, totalDaysInPeriod }: Props) {
  const { t } = useLocale();
  return (
    <div className="space-y-5 lg:space-y-6">
      <RankingsChart rankings={rankings} />

      <Card className="overflow-hidden py-0 gap-0">
        <CardHeader className="flex-row items-center justify-between border-b py-3.5 gap-2">
          <div>
            <div className="font-semibold text-sm">{t("reports.rankingsTitle")}</div>
            <p className="text-xs text-muted-foreground mt-0.5">{t("reports.rankingsFormula")}</p>
          </div>
          <div className="text-xs text-muted-foreground shrink-0">
            {t("reports.period")}: {totalDaysInPeriod} {t("reports.day")}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-center">{t("reports.colRank")}</TableHead>
                <TableHead className="ps-5">{t("reports.colEmployee")}</TableHead>
                <TableHead>{t("reports.colRole")}</TableHead>
                <TableHead className="text-center">{t("reports.colDays")}</TableHead>
                <TableHead className="text-center">{t("reports.colAttendance")}</TableHead>
                <TableHead className="text-center">{t("reports.colPunctuality")}</TableHead>
                <TableHead className="text-center">{t("reports.colReliability")}</TableHead>
                <TableHead className="text-center">{t("reports.colAvgLate")}</TableHead>
                <TableHead className="text-center">{t("reports.colAvgHours")}</TableHead>
                <TableHead className="text-center">{t("reports.colScore")}</TableHead>
                <TableHead className="pe-5 text-center">{t("reports.colGrade")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankings.map((r, i) => (
                <TableRow key={r.employeeId}>
                  <TableCell className="text-center">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold tabular-nums ${
                        i < 3 ? "bg-primary/10 text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </span>
                  </TableCell>
                  <TableCell className="ps-5">
                    <div className="font-semibold">{r.employeeName}</div>
                    <div className="text-xs text-muted-foreground">{r.employeeId}</div>
                  </TableCell>
                  <TableCell className="text-foreground/80 capitalize text-xs">{r.role.replace("_", " ")}</TableCell>
                  <TableCell className="text-center text-foreground/80">
                    {r.daysPresent}<span className="text-muted-foreground">/{r.totalDaysInPeriod}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <ScoreBar value={Math.min(100, r.attendanceRate)} suffix="%" />
                  </TableCell>
                  <TableCell className="text-center">
                    <ScoreBar value={r.punctualityScore} />
                  </TableCell>
                  <TableCell className="text-center">
                    <ScoreBar value={r.reliabilityScore} suffix="%" />
                  </TableCell>
                  <TableCell className="text-center text-foreground/80">
                    {r.avgMinutesLate > 0 ? `${r.avgMinutesLate.toFixed(0)}m` : <span className="text-emerald-500 font-medium">0m</span>}
                  </TableCell>
                  <TableCell className="text-center text-foreground/80">
                    {r.avgHoursPerDay > 0 ? r.avgHoursPerDay.toFixed(1) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-center font-bold">{r.overallScore.toFixed(1)}</TableCell>
                  <TableCell className="pe-5 text-center">
                    <GradeBadge grade={r.grade} />
                  </TableCell>
                </TableRow>
              ))}
              {rankings.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                    {t("reports.noDataPeriod")}
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
