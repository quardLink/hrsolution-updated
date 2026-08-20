import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/contexts/LocaleContext";
import { LEAVE_TYPES } from "../../lib/constants";
import { getDateKey } from "../../lib/attendance";
import type { LeaveRequestSuccessData } from "./LeaveRequestSuccess";

interface PublicEmployee {
  id: string;
  name: string;
}

interface Props {
  baseUrl: string;
  orgSlug: string;
  employees: PublicEmployee[];
  loadingEmps: boolean;
  loadError: string | null;
  onSuccess: (success: LeaveRequestSuccessData) => void;
}

export default function LeaveRequestForm({ baseUrl, orgSlug, employees, loadingEmps, loadError, onSuccess }: Props) {
  const { t } = useLocale();
  const [employeeId, setEmployeeId] = useState("");
  const [pin, setPin] = useState("");
  const [type, setType] = useState("annual");
  const [fromDate, setFromDate] = useState(getDateKey(new Date()));
  const [toDate, setToDate] = useState(getDateKey(new Date()));
  const [reason, setReason] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Surfaces the employee-list load failure in the same error slot used for
  // submit validation — matches the original single shared error state.
  useEffect(() => {
    if (loadError) setError(loadError);
  }, [loadError]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!employeeId) return setError(t("leavePublic.selectYourNameError"));
    if (!/^\d{4}$/.test(pin)) return setError(t("leavePublic.pinDigitsError"));
    if (toDate < fromDate) return setError(t("leavePublic.dateOrderError"));

    setSubmitting(true);
    try {
      const res = await fetch(`${baseUrl}/api/leave/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgSlug, employeeId, pin, fromDate, toDate, type, reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t("leavePublic.submitFailed"));
        return;
      }
      onSuccess({
        employeeName: data.request?.employeeName ?? "",
        fromDate,
        toDate,
        type: LEAVE_TYPES.find((lt) => lt.value === type)?.label ?? type,
      });
    } catch {
      setError(t("leavePublic.networkError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
      <div className="space-y-1.5">
        <Label>{t("leavePublic.yourNameRequired")}</Label>
        <Select required value={employeeId} onValueChange={setEmployeeId} disabled={loadingEmps}>
          <SelectTrigger>
            <SelectValue placeholder={loadingEmps ? t("leavePublic.loading") : t("leavePublic.selectYourName")} />
          </SelectTrigger>
          <SelectContent>
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>{t("leavePublic.pinRequired")}</Label>
        <Input
          type="password"
          inputMode="numeric"
          pattern="[0-9]{4}"
          maxLength={4}
          required
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          placeholder="••••"
          className="font-mono tracking-[0.5em] text-center text-lg"
        />
        <p className="text-xs text-muted-foreground">{t("leavePublic.pinHint")}</p>
      </div>

      <div className="space-y-1.5">
        <Label>{t("leavePublic.leaveTypeRequired")}</Label>
        <Select value={type} onValueChange={setType}>
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
          <Label>{t("leavePublic.from")}</Label>
          <Input type="date" required value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("leavePublic.to")}</Label>
          <Input type="date" required value={toDate} min={fromDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t("leavePublic.reason")}</Label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder={t("leavePublic.reasonPlaceholder")}
          className="resize-none"
        />
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-red-400 text-sm rounded-lg px-3 py-2">{error}</div>
      )}

      <Button type="submit" disabled={submitting} className="w-full" size="lg">
        {submitting ? t("leavePublic.submitting") : t("leavePublic.submitRequest")}
      </Button>

      <p className="text-xs text-center text-muted-foreground">{t("leavePublic.confirmNotice")}</p>
    </form>
  );
}
