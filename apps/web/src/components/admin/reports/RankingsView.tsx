import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale } from "@/contexts/LocaleContext";
import type { EmployeeRanking } from "../../../hooks/useAttendanceAnalytics";
import PodiumCard from "./PodiumCard";
import ScoreBar from "./ScoreBar";
import GradeBadge from "./GradeBadge";

interface Props {
  rankings: EmployeeRanking[];
  totalDaysInPeriod: number;
}

export default function RankingsView({ rankings, totalDaysInPeriod }: Props) {
  const { t } = useLocale();
  return (
    <div className="space-y-5 lg:space-y-6">
      {rankings.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PodiumCard rank={2} ranking={rankings[1]} />
          <PodiumCard rank={1} ranking={rankings[0]} />
          <PodiumCard rank={3} ranking={rankings[2]} />
        </div>
      )}

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
                <TableRow key={r.employeeId} className={i < 3 ? "bg-amber-500/5" : ""}>
                  <TableCell className="text-center font-bold">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
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
