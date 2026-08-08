import { useState, useEffect } from "react";

interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  fromDate: string;
  toDate: string;
  type: string;
  reason: string;
  status: string;
  createdAt: string;
  reviewedAt: string;
  reviewedBy: string;
}

interface Employee {
  id: string;
  name: string;
  active: boolean;
}

interface Props {
  password: string;
  baseUrl: string;
  onError: (msg: string) => void;
}

const TYPES = [
  { value: "annual", label: "Annual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "emergency", label: "Emergency" },
  { value: "unpaid", label: "Unpaid Leave" },
  { value: "other", label: "Other" },
];

export default function LeaveRequestsTab({ password, baseUrl, onError }: Props) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [form, setForm] = useState({
    employeeId: "",
    fromDate: "",
    toDate: "",
    type: "annual",
    reason: "",
  });

  async function load() {
    setLoading(true);
    try {
      const [reqRes, empRes] = await Promise.all([
        fetch(`${baseUrl}/api/admin/leave-requests`, {
          headers: { "x-admin-password": password },
        }),
        fetch(`${baseUrl}/api/admin/employees`, {
          headers: { "x-admin-password": password },
        }),
      ]);
      if (!reqRes.ok || !empRes.ok) {
        onError("Failed to load leave requests");
        return;
      }
      const reqData = await reqRes.json();
      const empData = await empRes.json();
      setRequests(reqData.requests ?? []);
      setEmployees((empData.employees ?? []).filter((e: Employee) => e.active));
    } catch {
      onError("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.employeeId || !form.fromDate || !form.toDate) {
      onError("Please fill in all required fields");
      return;
    }
    if (form.toDate < form.fromDate) {
      onError("End date cannot be before start date");
      return;
    }
    try {
      const res = await fetch(`${baseUrl}/api/admin/leave-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        onError(data.error || "Failed to create leave request");
        return;
      }
      setShowForm(false);
      setForm({ employeeId: "", fromDate: "", toDate: "", type: "annual", reason: "" });
      await load();
    } catch {
      onError("Network error");
    }
  }

  async function updateStatus(id: string, status: "approved" | "rejected") {
    try {
      const res = await fetch(`${baseUrl}/api/admin/leave-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ status, reviewedBy: "admin" }),
      });
      if (!res.ok) {
        onError("Failed to update request");
        return;
      }
      await load();
    } catch {
      onError("Network error");
    }
  }

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  function statusBadge(s: string) {
    const styles: Record<string, string> = {
      pending: "bg-amber-100 text-amber-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    return (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles[s] ?? "bg-gray-100 text-gray-700"}`}>
        {s}
      </span>
    );
  }

  function formatDate(s: string): string {
    if (!s) return "—";
    try {
      return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return s;
    }
  }

  function calcDays(r: LeaveRequest): number {
    if (!r.fromDate || !r.toDate) return 0;
    return Math.max(1, Math.round((new Date(r.toDate).getTime() - new Date(r.fromDate).getTime()) / 86400000) + 1);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-4 lg:p-5 border-b border-gray-200">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg lg:text-xl font-bold text-gray-900">Leave Requests</h2>
            <p className="text-sm text-gray-500 hidden sm:block">Track and manage time-off requests.</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-3 lg:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg whitespace-nowrap"
          >
            + New
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto -mx-1 px-1">
          {(["pending", "approved", "rejected", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-md capitalize transition-colors whitespace-nowrap ${
                filter === f ? "bg-blue-100 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No {filter !== "all" ? filter : ""} requests.</div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="lg:hidden divide-y divide-gray-100">
            {filtered.map((r) => (
              <div key={r.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900 truncate">{r.employeeName}</div>
                    <div className="text-xs text-gray-500 capitalize">{r.type} leave</div>
                  </div>
                  {statusBadge(r.status)}
                </div>
                <div className="text-sm text-gray-700">
                  {formatDate(r.fromDate)} → {formatDate(r.toDate)}
                  <span className="text-gray-500 ml-2">({calcDays(r)} day{calcDays(r) > 1 ? "s" : ""})</span>
                </div>
                {r.reason && (
                  <div className="text-xs text-gray-600 mt-1 italic">"{r.reason}"</div>
                )}
                {r.status === "pending" ? (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => updateStatus(r.id, "approved")}
                      className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => updateStatus(r.id, "rejected")}
                      className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 mt-2">
                    Reviewed by {r.reviewedBy || "—"}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-gray-500 bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-3 text-left">Employee</th>
                  <th className="px-5 py-3 text-left">Type</th>
                  <th className="px-5 py-3 text-left">From</th>
                  <th className="px-5 py-3 text-left">To</th>
                  <th className="px-5 py-3 text-left">Days</th>
                  <th className="px-5 py-3 text-left">Reason</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{r.employeeName}</td>
                    <td className="px-5 py-3 capitalize text-gray-700">{r.type}</td>
                    <td className="px-5 py-3 text-gray-700">{formatDate(r.fromDate)}</td>
                    <td className="px-5 py-3 text-gray-700">{formatDate(r.toDate)}</td>
                    <td className="px-5 py-3 text-gray-700">{calcDays(r)}</td>
                    <td className="px-5 py-3 text-gray-600 max-w-xs truncate" title={r.reason}>{r.reason || "—"}</td>
                    <td className="px-5 py-3">{statusBadge(r.status)}</td>
                    <td className="px-5 py-3 text-right space-x-1">
                      {r.status === "pending" ? (
                        <>
                          <button
                            onClick={() => updateStatus(r.id, "approved")}
                            className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => updateStatus(r.id, "rejected")}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-500">
                          by {r.reviewedBy || "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl max-w-md w-full">
            <form onSubmit={handleSubmit} className="p-5 lg:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">New Leave Request</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
                  <select
                    required
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select employee...</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {TYPES.map((t) => (
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
                      value={form.fromDate}
                      onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To *</label>
                    <input
                      type="date"
                      required
                      value={form.toDate}
                      onChange={(e) => setForm({ ...form, toDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <textarea
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Optional notes..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
