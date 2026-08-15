import { useState } from "react";
import BottomSheetModal from "../shared/BottomSheetModal";
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
  const [form, setForm] = useState<EmployeeFormValues>(editing ? { ...editing } : EMPTY_FORM);
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
              type="text"
              inputMode="decimal"
              value={salaryText}
              onChange={(e) => {
                const raw = parseDecimalInput(e.target.value);
                setSalaryText(raw);
                setForm({ ...form, monthlySalary: raw === "" || raw === "." ? 0 : Number(raw) });
              }}
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
            onClick={onClose}
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
    </BottomSheetModal>
  );
}
