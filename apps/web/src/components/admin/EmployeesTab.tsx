import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/contexts/LocaleContext";
import { useEmployees, type Employee } from "../../hooks/useEmployees";
import EmployeeList from "./employees/EmployeeList";
import EmployeeFormModal from "./employees/EmployeeFormModal";

export default function EmployeesTab() {
  const { t } = useLocale();
  const { employees, roles, loading, saveEmployee, deactivate, reactivate } = useEmployees();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");

  function openAdd() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(emp: Employee) {
    setEditing(emp);
    setShowForm(true);
  }

  const visible = employees.filter((e) => {
    if (!showInactive && !e.active) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-5 lg:space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold tracking-tight">{t("employees.title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5 hidden sm:block">{t("employees.subtitle")}</p>
        </div>
        <Button onClick={openAdd}>
          <Plus /> {t("employees.addEmployee")}
        </Button>
      </div>

      <Card className="overflow-hidden py-0 gap-0">
        <CardHeader className="border-b py-3.5">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t("employees.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
              <Switch checked={showInactive} onCheckedChange={setShowInactive} />
              {t("employees.showInactive")}
            </label>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <EmployeeList
            employees={visible}
            roles={roles}
            loading={loading}
            onEdit={openEdit}
            onDeactivate={deactivate}
            onReactivate={reactivate}
          />
        </CardContent>
      </Card>

      {showForm && (
        <EmployeeFormModal
          editing={editing}
          roles={roles}
          onClose={() => setShowForm(false)}
          onSave={saveEmployee}
        />
      )}
    </div>
  );
}
