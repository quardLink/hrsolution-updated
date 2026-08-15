import { useState } from "react";
import BottomSheetModal from "../shared/BottomSheetModal";
import { LEAVE_TYPES } from "../../../lib/constants";
import type { ActiveEmployee, NewLeaveRequestInput } from "../../../hooks/useLeaveRequests";

interface Props {
  employees: ActiveEmployee[];
  onClose: () => void;
  onSubmit: (input: NewLeaveRequestInput) => Promise<boolean>;
}

const EMPTY_FORM: NewLeaveRequestInput = { employeeId: "", fromDate: "", toDate: "", type: "annual", reason: "" };

export default function NewLeaveRequestModal({ employees, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<NewLeaveRequestInput>(EMPTY_FORM);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await onSubmit(form);
    if (ok) onClose();
  }

  return (
    <BottomSheetModal maxWidth="max-w-md">
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
            onClick={onClose}
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
    </BottomSheetModal>
  );
}
