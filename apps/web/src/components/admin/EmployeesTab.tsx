import { useState, useEffect } from "react";

interface Employee {
  id: string;
  name: string;
  pin: string;
  role: string;
  active: boolean;
  useCustomSchedule: boolean;
  morningStart: string;
  morningEnd: string;
  afternoonStart: string;
  afternoonEnd: string;
  monthlySalary: number;
}

interface Role {
  value: string;
  label: string;
}

interface Props {
  password: string;
  baseUrl: string;
  onError: (msg: string) => void;
}

const EMPTY_FORM: Omit<Employee, "id"> & { id: string } = {
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

export default function EmployeesTab({ password, baseUrl, onError }: Props) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [empRes, rolesRes] = await Promise.all([
        fetch(`${baseUrl}/api/admin/employees`, { headers: { "x-admin-password": password } }),
        fetch(`${baseUrl}/api/admin/roles`, { headers: { "x-admin-password": password } }),
      ]);
      if (!empRes.ok) {
        onError("Failed to load employees");
        return;
      }
      const empData = await empRes.json();
      setEmployees(empData.employees ?? []);
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData.roles ?? []);
      }
    } catch {
      onError("Network error loading employees");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function roleLabel(value: string): string {
    return roles.find((r) => r.value === value)?.label ?? value.replace(/_/g, " ");
  }

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(emp: Employee) {
    setEditing(emp);
    setForm({ ...emp });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.pin.trim()) {
      onError("Name and PIN are required");
      return;
    }
    if (!/^\d{4}$/.test(form.pin)) {
      onError("PIN must be exactly 4 digits");
      return;
    }
    try {
      const url = editing
        ? `${baseUrl}/api/admin/employees/${editing.id}`
        : `${baseUrl}/api/admin/employees`;
      const method = editing ? "PATCH" : "POST";
      const body = editing ? { ...form, id: undefined } : form;
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        onError(data.error || "Failed to save employee");
        return;
      }
      closeForm();
      await load();
    } catch {
      onError("Network error");
    }
  }

  async function handleDelete(emp: Employee) {
    if (!confirm(`Deactivate ${emp.name}? They will no longer appear on the keypad. This is reversible.`)) return;
    try {
      const res = await fetch(`${baseUrl}/api/admin/employees/${emp.id}`, {
        method: "DELETE",
        headers: { "x-admin-password": password },
      });
      if (!res.ok) {
        onError("Failed to deactivate employee");
        return;
      }
      await load();
    } catch {
      onError("Network error");
    }
  }

  async function handleReactivate(emp: Employee) {
    try {
      const res = await fetch(`${baseUrl}/api/admin/employees/${emp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ active: true }),
      });
      if (!res.ok) {
        onError("Failed to reactivate employee");
        return;
      }
      await load();
    } catch {
      onError("Network error");
    }
  }

  const visible = employees.filter((e) => {
    if (!showInactive && !e.active) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-4 lg:p-5 border-b border-gray-200">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg lg:text-xl font-bold text-gray-900">Employees</h2>
            <p className="text-sm text-gray-500 hidden sm:block">Add, edit, or deactivate employees and their PINs.</p>
          </div>
          <button
            onClick={openAdd}
            className="px-3 lg:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg whitespace-nowrap"
          >
            + Add
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="search"
            placeholder="Search by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <label className="flex items-center gap-2 text-sm text-gray-600 px-2">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded"
            />
            Show inactive
          </label>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : visible.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No employees found.</div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="lg:hidden divide-y divide-gray-100">
            {visible.map((emp) => (
              <div key={emp.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                      emp.active ? "bg-gradient-to-br from-blue-500 to-indigo-600" : "bg-gray-300"
                    }`}>
                      {emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 truncate">{emp.name}</div>
                      <div className="text-xs text-gray-500">
                        {emp.id} · {roleLabel(emp.role)}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Check-in by {emp.useCustomSchedule ? emp.morningStart : "office default"}
                      </div>
                    </div>
                  </div>
                  {!emp.active && (
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 text-xs flex-shrink-0">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="flex gap-2 mt-3 pl-13">
                  <button
                    onClick={() => openEdit(emp)}
                    className="flex-1 px-3 py-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm font-medium"
                  >
                    Edit
                  </button>
                  {emp.active ? (
                    <button
                      onClick={() => handleDelete(emp)}
                      className="flex-1 px-3 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactivate(emp)}
                      className="flex-1 px-3 py-1.5 text-green-700 bg-green-50 hover:bg-green-100 rounded-lg text-sm font-medium"
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-gray-500 bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-3 text-left">Employee</th>
                  <th className="px-5 py-3 text-left">Role</th>
                  <th className="px-5 py-3 text-left">PIN</th>
                  <th className="px-5 py-3 text-left">Check-In Time</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((emp) => (
                  <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                          emp.active ? "bg-gradient-to-br from-blue-500 to-indigo-600" : "bg-gray-300"
                        }`}>
                          {emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{emp.name}</div>
                          <div className="text-xs text-gray-500">{emp.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-700">{roleLabel(emp.role)}</td>
                    <td className="px-5 py-3 font-mono">••••</td>
                    <td className="px-5 py-3 text-gray-700 font-mono text-xs">
                      {emp.useCustomSchedule ? (
                        <span className="text-amber-700">{emp.morningStart} <span className="text-gray-400">(custom)</span></span>
                      ) : (
                        <span className="text-gray-500">Office default</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {emp.active ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs">Active</span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 text-xs">Inactive</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right space-x-1">
                      <button
                        onClick={() => openEdit(emp)}
                        className="px-2.5 py-1 text-blue-600 hover:bg-blue-50 rounded text-xs font-medium"
                      >
                        Edit
                      </button>
                      {emp.active ? (
                        <button
                          onClick={() => handleDelete(emp)}
                          className="px-2.5 py-1 text-red-600 hover:bg-red-50 rounded text-xs font-medium"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(emp)}
                          className="px-2.5 py-1 text-green-600 hover:bg-green-50 rounded text-xs font-medium"
                        >
                          Reactivate
                        </button>
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
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl max-w-lg w-full max-h-[92vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-5 lg:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {editing ? "Edit Employee" : "Add New Employee"}
              </h3>

              <div className="space-y-4">
                {!editing && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Employee ID (optional)
                    </label>
                    <input
                      type="text"
                      value={form.id}
                      onChange={(e) => setForm({ ...form, id: e.target.value })}
                      placeholder="Auto-generated (e.g. EMP008)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PIN (4 digits) *</label>
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    value={form.pin}
                    onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono tracking-widest"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary (SAR)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.monthlySalary}
                    onChange={(e) => setForm({ ...form, monthlySalary: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <p className="text-xs text-gray-400 mt-1">Used by the Payroll tab to calculate pay — required before running payroll for this employee.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {roles.length === 0 && (
                      <option value="other">Other</option>
                    )}
                    {roles.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                    {form.role && !roles.some((r) => r.value === form.role) && (
                      <option value={form.role}>{roleLabel(form.role)}</option>
                    )}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Manage the role list in Settings → Roles.
                  </p>
                </div>

                <div className="border-t pt-4">
                  <label className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      checked={form.useCustomSchedule}
                      onChange={(e) => setForm({ ...form, useCustomSchedule: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Use custom check-in time (override office default)
                    </span>
                  </label>

                  {form.useCustomSchedule && (
                    <div className="pl-6">
                      <label className="block text-xs text-gray-600 mb-1">Expected Check-In Time</label>
                      <input
                        type="time"
                        value={form.morningStart}
                        onChange={(e) => setForm({ ...form, morningStart: e.target.value })}
                        className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Employees arriving after this time are flagged as late.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                >
                  {editing ? "Save Changes" : "Add Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
