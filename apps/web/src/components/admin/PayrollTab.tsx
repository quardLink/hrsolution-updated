import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale } from "@/contexts/LocaleContext";
import { useAdminApi } from "../../contexts/AdminApiContext";
import { exportPayrollReportPdf, type PayrollResult } from "../../lib/pdf/payrollReport";
import OtApprovalsPanel from "./OtApprovalsPanel";

const now = new Date();

function PayrollBreakdownChart({ results }: { results: PayrollResult[] }) {
  const { t } = useLocale();
  // Same finalSalary the table below shows per row, just charted — sorted
  // highest-to-lowest so the bars read as a ranking, not a random order.
  const data = [...results]
    .sort((a, b) => b.finalSalary - a.finalSalary)
    .map((r) => ({ name: r.employeeName, salary: r.finalSalary, ot: r.otPay }));
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{t("payroll.chartTitle")}</CardTitle>
        <CardDescription>{t("payroll.chartSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="h-64 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={50}
            />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--popover-border))",
                borderRadius: 12,
                fontSize: 12,
              }}
              cursor={{ fill: "hsl(var(--accent) / 0.08)" }}
              formatter={(value: number) => `SAR ${value.toLocaleString()}`}
            />
            <Bar dataKey="salary" name={t("payroll.chartSalary")} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={36} />
            <Bar dataKey="ot" name={t("payroll.chartOt")} fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default function PayrollTab({ orgName }: { orgName?: string }) {
  const { t, dict } = useLocale();
  const { baseUrl, onError } = useAdminApi();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [results, setResults] = useState<PayrollResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  async function runPayroll() {
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/payroll-summary?year=${year}&month=${month}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        onError(data.error || "Failed to calculate payroll");
        return;
      }
      const data = await res.json();
      setResults(data.results ?? []);
      setHasRun(true);
    } catch {
      onError("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runPayroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPayout = results.reduce((sum, r) => sum + r.finalSalary, 0);
  const totalOtCost = results.reduce((sum, r) => sum + r.otPay, 0);
  const missingSalary = results.filter((r) => r.baseSalary === 0);

  return (
    <div className="space-y-5 lg:space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-semibold tracking-tight">{t("payroll.title")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t("payroll.subtitle")}</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 py-5">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("payroll.year")}</Label>
            <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-24" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("payroll.month")}</Label>
            <Input
              type="number"
              min={1}
              max={12}
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-20"
            />
          </div>
          <Button onClick={runPayroll} disabled={loading}>
            {loading ? t("payroll.calculating") : t("payroll.run")}
          </Button>
          {hasRun && results.length > 0 && (
            <Button variant="secondary" onClick={() => exportPayrollReportPdf({ year, month, results, orgName })}>
              <Download /> {t("payroll.exportPdf")}
            </Button>
          )}
        </CardContent>
      </Card>

      {missingSalary.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-500 text-sm rounded-lg p-3">
          {dict.payroll.missingSalary(missingSalary.map((r) => r.employeeName))}
        </div>
      )}

      {hasRun && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 gap-1">
              <p className="text-xs text-muted-foreground">{t("payroll.totalPayout")}</p>
              <p className="text-xl font-semibold">
                SAR {totalPayout.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </Card>
            <Card className="p-4 gap-1">
              <p className="text-xs text-muted-foreground">{t("payroll.totalOtCost")}</p>
              <p className="text-xl font-semibold">
                SAR {totalOtCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </Card>
          </div>

          {results.length > 1 && <PayrollBreakdownChart results={results} />}

          <Card className="overflow-hidden py-0 gap-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="ps-5 sticky left-0 bg-card z-10">{t("payroll.colEmployee")}</TableHead>
                    <TableHead>{t("payroll.colMethod")}</TableHead>
                    <TableHead>{t("payroll.colWorkedHours")}</TableHead>
                    <TableHead>{t("payroll.colOtHours")}</TableHead>
                    <TableHead>{t("payroll.colOtPay")}</TableHead>
                    <TableHead>{t("payroll.colLeave")}</TableHead>
                    <TableHead>{t("payroll.colAbsentDays")}</TableHead>
                    <TableHead>{t("payroll.colDeduction")}</TableHead>
                    <TableHead className="pe-5">{t("payroll.colFinalSalary")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => {
                    const totalDeduction = r.leaveDeduction + r.absenceDeduction + r.shortHoursDeduction + r.halfDayDeduction;
                    return (
                      <TableRow key={r.employeeId}>
                        <TableCell className="ps-5 font-medium sticky left-0 bg-card z-10">{r.employeeName}</TableCell>
                        <TableCell>
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
                            {r.method === "daily" ? t("payroll.methodDaily") : t("payroll.methodHourly")}
                          </span>
                        </TableCell>
                        <TableCell className="text-foreground/80">
                          {r.method === "daily" ? (
                            <span title={dict.payroll.fullHalfDaysTooltip(r.fullDays, r.halfDays)}>
                              {r.fullDays}F / {r.halfDays}H
                            </span>
                          ) : (
                            r.totalWorkedHours
                          )}
                        </TableCell>
                        <TableCell className="text-foreground/80">
                          {r.totalOtHours}
                          {r.pendingOtHours > 0 && (
                            <span className="ms-1.5 text-[10px] font-medium text-amber-600 bg-amber-500/15 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                              {dict.payroll.pendingOtBadge(r.pendingOtHours)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-foreground/80">{r.otPay.toLocaleString()}</TableCell>
                        <TableCell className="text-foreground/80">{r.paidLeaveDays} / {r.unpaidLeaveDays}</TableCell>
                        <TableCell className="text-foreground/80">{r.absentDays}</TableCell>
                        <TableCell className="text-red-500">-{totalDeduction.toLocaleString()}</TableCell>
                        <TableCell className="pe-5 font-semibold">SAR {r.finalSalary.toLocaleString()}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <OtApprovalsPanel year={year} month={month} />

          <p className="text-xs text-muted-foreground/70">{t("payroll.note")}</p>
        </>
      )}
    </div>
  );
}
