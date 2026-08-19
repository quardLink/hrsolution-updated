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

const fieldClass = "w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-ring";

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
        <h3 className="text-lg font-bold text-foreground mb-4">New Leave Request</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/90 mb-1">Employee *</label>
            <select
              required
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              className={fieldClass}
            >
              <option value="">Select employee...</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/90 mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
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
                value={form.fromDate}
                onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-1">To *</label>
              <input
                type="date"
                required
                value={form.toDate}
                onChange={(e) => setForm({ ...form, toDate: e.target.value })}
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/90 mb-1">Reason</label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              rows={3}
              className={fieldClass}
              placeholder="Optional notes..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-foreground/80 hover:bg-muted rounded-lg text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-lg text-sm font-medium"
          >
            Submit Request
          </button>
        </div>
      </form>
    </BottomSheetModal>
  );
}
