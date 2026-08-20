import { useState } from "react";
import BottomSheetModal from "../shared/BottomSheetModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/contexts/LocaleContext";
import { LEAVE_TYPES } from "../../../lib/constants";
import type { ActiveEmployee, NewLeaveRequestInput } from "../../../hooks/useLeaveRequests";

interface Props {
  employees: ActiveEmployee[];
  onClose: () => void;
  onSubmit: (input: NewLeaveRequestInput) => Promise<boolean>;
}

const EMPTY_FORM: NewLeaveRequestInput = { employeeId: "", fromDate: "", toDate: "", type: "annual", reason: "" };

export default function NewLeaveRequestModal({ employees, onClose, onSubmit }: Props) {
  const { t } = useLocale();
  const [form, setForm] = useState<NewLeaveRequestInput>(EMPTY_FORM);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await onSubmit(form);
    if (ok) onClose();
  }

  return (
    <BottomSheetModal maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="p-5 lg:p-6">
        <h3 className="text-lg font-semibold mb-4">{t("leave.newRequest")}</h3>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("leave.employeeRequired")}</Label>
            <Select required value={form.employeeId} onValueChange={(value) => setForm({ ...form, employeeId: value })}>
              <SelectTrigger>
                <SelectValue placeholder={t("leave.selectEmployee")} />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t("leave.type")}</Label>
            <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map((lt) => (
                  <SelectItem key={lt.value} value={lt.value}>{lt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("leave.from")}</Label>
              <Input type="date" required value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("leave.to")}</Label>
              <Input type="date" required value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("leave.reason")}</Label>
            <Textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              rows={3}
              placeholder={t("leave.reasonPlaceholder")}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit">{t("leave.submitRequest")}</Button>
        </div>
      </form>
    </BottomSheetModal>
  );
}
