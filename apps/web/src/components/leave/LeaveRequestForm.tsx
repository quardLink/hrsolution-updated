import { useEffect, useState } from "react";
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

const fieldClass =
  "w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-primary/50";

export default function LeaveRequestForm({ baseUrl, orgSlug, employees, loadingEmps, loadError, onSuccess }: Props) {
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
    if (!employeeId) return setError("Please select your name.");
    if (!/^\d{4}$/.test(pin)) return setError("PIN must be exactly 4 digits.");
    if (toDate < fromDate) return setError("End date can't be before start date.");

    setSubmitting(true);
    try {
      const res = await fetch(`${baseUrl}/api/leave/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgSlug, employeeId, pin, fromDate, toDate, type, reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to submit request.");
        return;
      }
      onSuccess({
        employeeName: data.request?.employeeName ?? "",
        fromDate,
        toDate,
        type: LEAVE_TYPES.find((t) => t.value === type)?.label ?? type,
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground/90 mb-1">Your Name *</label>
        <select
          required
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          disabled={loadingEmps}
          className={fieldClass}
        >
          <option value="">{loadingEmps ? "Loading..." : "— Select your name —"}</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground/90 mb-1">PIN (4 digits) *</label>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]{4}"
          maxLength={4}
          required
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          placeholder="••••"
          className={`${fieldClass} font-mono tracking-[0.5em] text-center text-lg`}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Same PIN you use on the attendance kiosk.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground/90 mb-1">Leave Type *</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={fieldClass}
        >
          {LEAVE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground/90 mb-1">From *</label>
          <input
            type="date"
            required
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/90 mb-1">To *</label>
          <input
            type="date"
            required
            value={toDate}
            min={fromDate}
            onChange={(e) => setToDate(e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground/90 mb-1">Reason</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Brief reason (optional)"
          className={`${fieldClass} resize-none`}
        />
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-red-400 text-sm rounded-lg px-3 py-2">{error}</div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-lg disabled:opacity-50 transition-all"
      >
        {submitting ? "Submitting..." : "Submit Request"}
      </button>

      <p className="text-xs text-center text-muted-foreground">
        By submitting, you confirm the details above are accurate.
      </p>
    </form>
  );
}
