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
    <div className="bg-card rounded-xl border border-border p-4 lg:p-6 max-w-2xl">
      <h2 className="text-lg lg:text-xl font-bold text-foreground mb-1">Roles</h2>
      <p className="text-sm text-muted-foreground mb-5">
        Manage the list of job titles that appear when adding or editing employees.
      </p>

      <div className="border border-border rounded-lg divide-y divide-border mb-5">
        {roles.length === 0 && (
          <div className="px-4 py-6 text-center text-muted-foreground text-sm">No roles defined.</div>
        )}
        {roles.map((r) => (
          <div key={r.value} className="px-4 py-3 flex items-center gap-3">
            {editingRole === r.value ? (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground font-mono mb-1">{r.value}</div>
                  <input
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    autoFocus
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveEdit(r.value)}
                  className="px-3 py-1.5 bg-primary hover:opacity-90 text-primary-foreground rounded-lg text-sm font-medium"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingRole(null); setEditLabel(""); }}
                  className="px-3 py-1.5 text-muted-foreground hover:bg-muted rounded-lg text-sm"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">{r.label}</div>
                  <div className="text-xs text-muted-foreground font-mono truncate">{r.value}</div>
                </div>
                <button
                  type="button"
                  onClick={() => { setEditingRole(r.value); setEditLabel(r.label); }}
                  className="px-2.5 py-1 text-indigo-300 hover:bg-indigo-500/10 rounded text-xs font-medium"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(r.value)}
                  className="px-2.5 py-1 text-red-400 hover:bg-red-500/10 rounded text-xs font-medium"
                >
                  Remove
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-4">
        <h3 className="font-semibold text-foreground mb-3 text-sm">Add Role</h3>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
          <input
            type="text"
            placeholder="Display name (e.g. Driver)"
            value={roleDraft.label}
            onChange={(e) => setRoleDraft({ ...roleDraft, label: e.target.value })}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <input
            type="text"
            placeholder="Internal key (e.g. driver)"
            value={roleDraft.value}
            onChange={(e) => setRoleDraft({ ...roleDraft, value: e.target.value.toLowerCase() })}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-lg text-sm font-medium"
          >
            Add
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          The internal key is used internally; the display name is what the admin sees.
        </p>
      </div>
    </div>
  );
}
