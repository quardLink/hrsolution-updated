import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale } from "@/contexts/LocaleContext";
import { useAdminApi } from "../../contexts/AdminApiContext";
import { exportPayrollReportPdf, type PayrollResult } from "../../lib/pdf/payrollReport";

const now = new Date();

export default function PayrollTab() {
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
            <Button variant="secondary" onClick={() => exportPayrollReportPdf({ year, month, results })}>
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

          <Card className="overflow-hidden py-0 gap-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="ps-5">{t("payroll.colEmployee")}</TableHead>
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
                  {results.map((r) => (
                    <TableRow key={r.employeeId}>
                      <TableCell className="ps-5 font-medium">{r.employeeName}</TableCell>
                      <TableCell className="text-foreground/80">{r.totalWorkedHours}</TableCell>
                      <TableCell className="text-foreground/80">{r.totalOtHours}</TableCell>
                      <TableCell className="text-foreground/80">{r.otPay.toLocaleString()}</TableCell>
                      <TableCell className="text-foreground/80">{r.paidLeaveDays} / {r.unpaidLeaveDays}</TableCell>
                      <TableCell className="text-foreground/80">{r.absentDays}</TableCell>
                      <TableCell className="text-red-500">-{(r.leaveDeduction + r.absenceDeduction).toLocaleString()}</TableCell>
                      <TableCell className="pe-5 font-semibold">SAR {r.finalSalary.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground/70">{t("payroll.note")}</p>
        </>
      )}
    </div>
  );
}
