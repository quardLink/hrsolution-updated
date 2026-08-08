import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";

interface PublicEmployee {
  id: string;
  name: string;
}

const LEAVE_TYPES: { value: string; label: string }[] = [
  { value: "annual", label: "Annual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "emergency", label: "Emergency" },
  { value: "unpaid", label: "Unpaid Leave" },
  { value: "other", label: "Other" },
];

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function LeavePage() {
  const baseUrl = useMemo(() => import.meta.env.BASE_URL.replace(/\/$/, ""), []);

  const [employees, setEmployees] = useState<PublicEmployee[]>([]);
  const [loadingEmps, setLoadingEmps] = useState(true);

  const [employeeId, setEmployeeId] = useState("");
  const [pin, setPin] = useState("");
  const [type, setType] = useState("annual");
  const [fromDate, setFromDate] = useState(todayISO());
  const [toDate, setToDate] = useState(todayISO());
  const [reason, setReason] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    employeeName: string;
    fromDate: string;
    toDate: string;
    type: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${baseUrl}/api/leave/employees`);
        if (!res.ok) throw new Error("Failed to load employees");
        const data = await res.json();
        if (!cancelled) setEmployees(data.employees ?? []);
      } catch {
        if (!cancelled) setError("Could not load employee list. Please refresh.");
      } finally {
        if (!cancelled) setLoadingEmps(false);
      }
    })();
    return () => { cancelled = true; };
  }, [baseUrl]);

  function reset() {
    setEmployeeId("");
    setPin("");
    setType("annual");
    setFromDate(todayISO());
    setToDate(todayISO());
    setReason("");
    setError(null);
    setSuccess(null);
  }

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
      setSuccess({
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4 py-6 sm:py-12">
      <div className="max-w-md mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          ← Back to attendance
        </Link>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-5 sm:px-6 py-5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center text-2xl">
                🏖️
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">Leave Request</h1>
                <p className="text-xs text-blue-100 mt-0.5">Petro Safe Tech · Saudi Arabia</p>
              </div>
            </div>
          </div>

          {success ? (
            <div className="p-6 sm:p-8 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center text-3xl mb-4">
                ✓
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Request submitted</h2>
              <div className="text-sm text-gray-600 space-y-1 mb-6">
                <p>Thank you, <span className="font-medium text-gray-900">{success.employeeName}</span>.</p>
                <p>
                  Your <span className="font-medium">{success.type}</span> request for{" "}
                  <span className="font-medium">{success.fromDate}</span>
                  {success.fromDate !== success.toDate && (
                    <> → <span className="font-medium">{success.toDate}</span></>
                  )}{" "}
                  has been sent to admin for review.
                </p>
                <p className="pt-2 text-xs text-gray-500">
                  You'll be informed once it's approved or rejected.
                </p>
              </div>
              <button
                onClick={reset}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
              >
                Submit another request
              </button>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
