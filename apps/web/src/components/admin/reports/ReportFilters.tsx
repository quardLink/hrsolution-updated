import { Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/contexts/LocaleContext";
import StatCard from "./StatCard";
import type { AttendanceReportStats } from "../../../lib/pdf/attendanceReport";

interface EmployeeOption {
  id: string;
  name: string;
}

interface Props {
  stats: AttendanceReportStats;
  filterFromDate: string;
  onFilterFromDateChange: (value: string) => void;
  filterToDate: string;
  onFilterToDateChange: (value: string) => void;
  filterEmployee: string;
  onFilterEmployeeChange: (value: string) => void;
  employees: EmployeeOption[];
  onExportPdf: () => void;
}

export default function ReportFilters({
  stats,
  filterFromDate,
  onFilterFromDateChange,
  filterToDate,
  onFilterToDateChange,
  filterEmployee,
  onFilterEmployeeChange,
  employees,
  onExportPdf,
}: Props) {
  const { t } = useLocale();
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
        <StatCard label={t("reports.totalRecords")} value={stats.totalRecords} color="blue" />
        <StatCard label={t("reports.checkIns")} value={stats.totalCheckIns} color="emerald" />
        <StatCard label={t("reports.checkOuts")} value={stats.totalCheckOuts} color="indigo" />
        <StatCard label={t("reports.daysTracked")} value={stats.uniqueDays} color="violet" />
        <StatCard label={t("reports.anomalies")} value={stats.anomalies} color="amber" />
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("reports.fromDate")}</Label>
              <Input type="date" value={filterFromDate} onChange={(e) => onFilterFromDateChange(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("reports.toDate")}</Label>
              <Input type="date" value={filterToDate} onChange={(e) => onFilterToDateChange(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("reports.employee")}</Label>
              <Select value={filterEmployee} onValueChange={onFilterEmployeeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("reports.allEmployees")}</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name} ({e.id})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={onExportPdf} variant="secondary" className="w-full">
              <Download /> {t("reports.exportPdf")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
