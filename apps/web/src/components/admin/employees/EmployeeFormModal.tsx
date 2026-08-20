import { useState } from "react";
import BottomSheetModal from "../shared/BottomSheetModal";
import FaceEnroll from "./FaceEnroll";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/contexts/LocaleContext";
import { parseDecimalInput } from "../../../lib/utils";
import type { Employee, EmployeeFormValues, EmployeeRole } from "../../../hooks/useEmployees";

interface Props {
  editing: Employee | null;
  roles: EmployeeRole[];
  onClose: () => void;
  onSave: (form: EmployeeFormValues, editing: Employee | null) => Promise<boolean>;
}

const EMPTY_FORM: EmployeeFormValues = {
  id: "",
  name: "",
  pin: "",
  role: "other",
  active: true,
  useCustomSchedule: false,
  morningStart: "08:00",
  morningEnd: "13:30",
  afternoonStart: "16:00",
  afternoonEnd: "19:00",
  monthlySalary: 0,
};

export default function EmployeeFormModal({ editing, roles, onClose, onSave }: Props) {
  const { t } = useLocale();
  const [form, setForm] = useState<EmployeeFormValues>(editing ? { ...editing, pin: "" } : EMPTY_FORM);
  const [salaryText, setSalaryText] = useState(
    editing && editing.monthlySalary !== 0 ? String(editing.monthlySalary) : "",
  );

  function roleLabel(value: string): string {
    return roles.find((r) => r.value === value)?.label ?? value.replace(/_/g, " ");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await onSave(form, editing);
    if (ok) onClose();
  }

  return (
    <BottomSheetModal maxWidth="max-w-lg" scrollable>
      <form onSubmit={handleSubmit} className="p-5 lg:p-6">
        <h3 className="text-lg font-semibold mb-4">
          {editing ? t("employees.editEmployee") : t("employees.addEmployee")}
        </h3>

        <div className="space-y-4">
          {!editing && (
            <div className="space-y-1.5">
              <Label>{t("employees.employeeId")} ({t("common.optional")})</Label>
              <Input
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                placeholder={t("employees.employeeIdHint")}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>{t("employees.nameRequired")}</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="space-y-1.5">
            <Label>{editing ? t("employees.pinLabelEdit") : t("employees.pinLabelCreate")}</Label>
            <Input
              required={!editing}
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              value={form.pin}
              placeholder={editing ? t("employees.pinPlaceholderEdit") : undefined}
              onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })}
              className="font-mono tracking-widest"
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("employees.monthlySalary")}</Label>
            <Input
              inputMode="decimal"
              value={salaryText}
              onChange={(e) => {
                const raw = parseDecimalInput(e.target.value);
                setSalaryText(raw);
                setForm({ ...form, monthlySalary: raw === "" || raw === "." ? 0 : Number(raw) });
              }}
            />
            <p className="text-xs text-muted-foreground">{t("employees.monthlySalaryHint")}</p>
          </div>

          <div className="space-y-1.5">
            <Label>{t("common.role")}</Label>
            <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.length === 0 && <SelectItem value="other">Other</SelectItem>}
                {roles.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
                {form.role && !roles.some((r) => r.value === form.role) && (
                  <SelectItem value={form.role}>{roleLabel(form.role)}</SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t("employees.roleManageHint")}</p>
          </div>

          <FaceEnroll
            currentlyEnrolled={editing?.faceEnrolled ?? false}
            pending={form.faceDescriptor}
            onCapture={(descriptor) => setForm({ ...form, faceDescriptor: descriptor })}
            onClear={() => setForm({ ...form, faceDescriptor: null })}
          />

          <div className="border-t pt-4">
            <label className="flex items-center gap-2.5 mb-3 cursor-pointer">
              <Checkbox
                checked={form.useCustomSchedule}
                onCheckedChange={(checked) => setForm({ ...form, useCustomSchedule: checked === true })}
              />
              <span className="text-sm font-medium">{t("employees.customSchedule")}</span>
            </label>

            {form.useCustomSchedule && (
              <div className="ps-6.5 space-y-1.5">
                <Label className="text-xs text-muted-foreground font-normal">{t("employees.expectedCheckIn")}</Label>
                <Input
                  type="time"
                  value={form.morningStart}
                  onChange={(e) => setForm({ ...form, morningStart: e.target.value })}
                  className="w-full sm:w-48 text-sm"
                />
                <p className="text-xs text-muted-foreground">{t("employees.customScheduleHint")}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit">
            {editing ? t("common.saveChanges") : t("employees.addEmployee")}
          </Button>
        </div>
      </form>
    </BottomSheetModal>
  );
}
