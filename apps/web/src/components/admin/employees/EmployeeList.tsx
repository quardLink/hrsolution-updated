import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import type { Employee, EmployeeRole } from "../../../hooks/useEmployees";

interface Props {
  employees: Employee[];
  roles: EmployeeRole[];
  loading: boolean;
  onEdit: (emp: Employee) => void;
  onDeactivate: (emp: Employee) => void;
  onReactivate: (emp: Employee) => void;
}

function initials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function EmployeeList({ employees, roles, loading, onEdit, onDeactivate, onReactivate }: Props) {
  const { t } = useLocale();

  function roleLabel(value: string): string {
    return roles.find((r) => r.value === value)?.label ?? value.replace(/_/g, " ");
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground text-sm">{t("common.loading")}</div>;
  }
  if (employees.length === 0) {
    return <div className="text-center py-12 text-muted-foreground text-sm">{t("employees.noResults")}</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="ps-5">{t("common.name")}</TableHead>
          <TableHead>{t("common.role")}</TableHead>
          <TableHead>{t("employees.pin")}</TableHead>
          <TableHead>{t("employees.checkInTime")}</TableHead>
          <TableHead>{t("common.status")}</TableHead>
          <TableHead className="pe-5 text-end">{t("common.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((emp) => (
          <TableRow key={emp.id}>
            <TableCell className="ps-5">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs shrink-0 ${
                    emp.active ? "bg-primary" : "bg-muted-foreground/40"
                  }`}
                >
                  {initials(emp.name)}
                </div>
                <div>
                  <div className="font-medium">{emp.name}</div>
                  <div className="text-xs text-muted-foreground">{emp.id}</div>
                </div>
              </div>
            </TableCell>
            <TableCell className="text-foreground/80">{roleLabel(emp.role)}</TableCell>
            <TableCell className="font-mono text-muted-foreground">••••</TableCell>
            <TableCell className="text-foreground/80 font-mono text-xs">
              {emp.useCustomSchedule ? (
                <span className="text-amber-500">
                  {emp.morningStart} <span className="text-muted-foreground">({t("employees.custom")})</span>
                </span>
              ) : (
                <span className="text-muted-foreground">{t("employees.officeDefault")}</span>
              )}
            </TableCell>
            <TableCell>
              {emp.active ? (
                <Badge variant="outline" className="border-transparent bg-emerald-500/10 text-emerald-500">{t("common.active")}</Badge>
              ) : (
                <Badge variant="secondary">{t("common.inactive")}</Badge>
              )}
            </TableCell>
            <TableCell className="pe-5 text-end">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => onEdit(emp)} className="text-primary hover:text-primary">
                  {t("common.edit")}
                </Button>
                {emp.active ? (
                  <Button variant="ghost" size="sm" onClick={() => onDeactivate(emp)} className="text-red-500 hover:text-red-500">
                    {t("common.deactivate")}
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => onReactivate(emp)} className="text-emerald-500 hover:text-emerald-500">
                    {t("common.reactivate")}
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
