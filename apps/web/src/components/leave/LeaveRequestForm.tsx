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
  employees: PublicEmployee[];
  loadingEmps: boolean;
  loadError: string | null;
  onSuccess: (success: LeaveRequestSuccessData) => void;
}

export default function LeaveRequestForm({ baseUrl, employees, loadingEmps, loadError, onSuccess }: Props) {
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
        body: JSON.stringify({ employeeId, pin, fromDate, toDate, type, reason }),
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
        <select
          required
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          disabled={loadingEmps}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white"
        >
          <option value="">{loadingEmps ? "Loading..." : "— Select your name —"}</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">PIN (4 digits) *</label>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]{4}"
          maxLength={4}
          required
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          placeholder="••••"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg font-mono tracking-[0.5em] text-center text-lg"
        />
        <p className="text-xs text-gray-500 mt-1">
          Same PIN you use on the attendance kiosk.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type *</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white"
        >
          {LEAVE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">From *</label>
          <input
            type="date"
            required
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To *</label>
          <input
            type="date"
            required
            value={toDate}
            min={fromDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Brief reason (optional)"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg resize-none"
        />
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg disabled:opacity-50 transition-all"
      >
        {submitting ? "Submitting..." : "Submit Request"}
      </button>

      <p className="text-xs text-center text-gray-500">
        By submitting, you confirm the details above are accurate.
      </p>
    </form>
  );
}
