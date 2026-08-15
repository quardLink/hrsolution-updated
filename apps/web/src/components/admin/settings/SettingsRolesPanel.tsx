import { useState } from "react";
import type { Role } from "../../../hooks/useRoles";

interface Props {
  roles: Role[];
  onAdd: (value: string, label: string) => Promise<boolean>;
  onSaveEdit: (oldValue: string, label: string) => Promise<boolean>;
  onRemove: (value: string) => Promise<void>;
}

export default function SettingsRolesPanel({ roles, onAdd, onSaveEdit, onRemove }: Props) {
  const [roleDraft, setRoleDraft] = useState<{ value: string; label: string }>({ value: "", label: "" });
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  async function handleAdd() {
    const ok = await onAdd(roleDraft.value.trim(), roleDraft.label.trim());
    if (ok) setRoleDraft({ value: "", label: "" });
  }

  async function handleSaveEdit(oldValue: string) {
    const ok = await onSaveEdit(oldValue, editLabel.trim());
    if (ok) {
      setEditingRole(null);
      setEditLabel("");
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 max-w-2xl">
      <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-1">Roles</h2>
      <p className="text-sm text-gray-500 mb-5">
        Manage the list of job titles that appear when adding or editing employees.
      </p>

      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 mb-5">
        {roles.length === 0 && (
          <div className="px-4 py-6 text-center text-gray-500 text-sm">No roles defined.</div>
        )}
        {roles.map((r) => (
          <div key={r.value} className="px-4 py-3 flex items-center gap-3">
            {editingRole === r.value ? (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 font-mono mb-1">{r.value}</div>
                  <input
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    autoFocus
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveEdit(r.value)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingRole(null); setEditLabel(""); }}
                  className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{r.label}</div>
                  <div className="text-xs text-gray-500 font-mono truncate">{r.value}</div>
                </div>
                <button
                  type="button"
                  onClick={() => { setEditingRole(r.value); setEditLabel(r.label); }}
                  className="px-2.5 py-1 text-blue-600 hover:bg-blue-50 rounded text-xs font-medium"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(r.value)}
                  className="px-2.5 py-1 text-red-600 hover:bg-red-50 rounded text-xs font-medium"
                >
                  Remove
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="border-t pt-4">
        <h3 className="font-semibold text-gray-900 mb-3 text-sm">Add Role</h3>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
          <input
            type="text"
            placeholder="Display name (e.g. Driver)"
            value={roleDraft.label}
            onChange={(e) => setRoleDraft({ ...roleDraft, label: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <input
            type="text"
            placeholder="Internal key (e.g. driver)"
            value={roleDraft.value}
            onChange={(e) => setRoleDraft({ ...roleDraft, value: e.target.value.toLowerCase() })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            Add
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          The internal key is used internally; the display name is what the admin sees.
        </p>
      </div>
    </div>
  );
}
