import { useState, useEffect } from "react";

interface OfficeSettings {
  defaultMorningStart: string;
  defaultMorningEnd: string;
  defaultAfternoonStart: string;
  defaultAfternoonEnd: string;
  lunchBreakEnd: string;
  companyName: string;
  lateThresholdMinutes: string;
  hasCustomAdminPassword?: boolean;
}

interface Role {
  value: string;
  label: string;
}

interface Props {
  password: string;
  baseUrl: string;
  onError: (msg: string) => void;
  onPasswordChanged?: (newPassword: string) => void;
}

type Section = "general" | "hours" | "roles" | "security";

export default function SettingsTab({ password, baseUrl, onError, onPasswordChanged }: Props) {
  const [section, setSection] = useState<Section>("general");
  const [settings, setSettings] = useState<OfficeSettings | null>(null);
  const [draft, setDraft] = useState<OfficeSettings | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Roles editor state
  const [roleDraft, setRoleDraft] = useState<{ value: string; label: string }>({ value: "", label: "" });
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  // Password change state
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [sRes, rRes] = await Promise.all([
        fetch(`${baseUrl}/api/admin/settings`, { headers: { "x-admin-password": password } }),
        fetch(`${baseUrl}/api/admin/roles`, { headers: { "x-admin-password": password } }),
      ]);
      if (!sRes.ok) {
        onError("Failed to load settings");
        return;
      }
      const sData = await sRes.json();
      setSettings(sData.settings);
      setDraft(sData.settings);
      if (rRes.ok) {
        const rData = await rRes.json();
        setRoles(rData.roles ?? []);
      }
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

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        onError("Failed to save settings");
        return;
      }
      const data = await res.json();
      setSettings(data.settings);
      setDraft(data.settings);
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 3000);
    } catch {
      onError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function reloadRoles() {
    const res = await fetch(`${baseUrl}/api/admin/roles`, { headers: { "x-admin-password": password } });
    if (res.ok) {
      const data = await res.json();
      setRoles(data.roles ?? []);
    }
  }

  async function addRole() {
    const value = roleDraft.value.trim();
    const label = roleDraft.label.trim();
    if (!value || !label) {
      onError("Role key and label are required");
      return;
    }
    try {
      const res = await fetch(`${baseUrl}/api/admin/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ value, label }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        onError(d.error || "Failed to add role");
        return;
      }
      setRoleDraft({ value: "", label: "" });
      await reloadRoles();
    } catch {
      onError("Network error");
    }
  }

  async function saveRoleEdit(oldValue: string) {
    const label = editLabel.trim();
    if (!label) return;
    try {
      const res = await fetch(`${baseUrl}/api/admin/roles/${encodeURIComponent(oldValue)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ label }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        onError(d.error || "Failed to update role");
        return;
      }
      setEditingRole(null);
      setEditLabel("");
      await reloadRoles();
    } catch {
      onError("Network error");
    }
  }

  async function removeRole(value: string) {
    if (!confirm(`Remove role "${value}"? Existing employees with this role will keep it but it won't appear in the dropdown.`)) return;
    try {
      const res = await fetch(`${baseUrl}/api/admin/roles/${encodeURIComponent(value)}`, {
        method: "DELETE",
        headers: { "x-admin-password": password },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        onError(d.error || "Failed to delete role");
        return;
      }
      await reloadRoles();
    } catch {
      onError("Network error");
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (!pwForm.current || !pwForm.next) {
      setPwMsg({ kind: "err", text: "Please fill in all fields" });
      return;
    }
    if (pwForm.next.length < 6) {
      setPwMsg({ kind: "err", text: "New password must be at least 6 characters" });
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ kind: "err", text: "New password and confirmation don't match" });
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ oldPassword: pwForm.current, newPassword: pwForm.next }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setPwMsg({ kind: "err", text: d.error || "Failed to change password" });
        return;
      }
      setPwMsg({ kind: "ok", text: "Password changed. Please use the new password next time you sign in." });
      setPwForm({ current: "", next: "", confirm: "" });
      onPasswordChanged?.(pwForm.next);
      // Refresh settings to update hasCustomAdminPassword flag
      load();
    } catch {
      setPwMsg({ kind: "err", text: "Network error" });
    } finally {
      setPwSaving(false);
    }
  }

  if (loading || !draft) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8 text-gray-500">Loading settings...</div>
      </div>
    );
  }

  const isDirty = settings && JSON.stringify(settings) !== JSON.stringify(draft);

  const SECTIONS: { id: Section; label: string; icon: string }[] = [
    { id: "general", label: "General", icon: "🏢" },
    { id: "hours", label: "Working Hours", icon: "🕒" },
    { id: "roles", label: "Roles", icon: "🏷️" },
    { id: "security", label: "Security", icon: "🔒" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4 lg:gap-6">
      {/* Section nav */}
      <nav className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 lg:p-3 h-fit lg:sticky lg:top-4">
        <div className="flex lg:flex-col gap-1 overflow-x-auto">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                section === s.id
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Section content */}
      <div className="min-w-0">
        {section === "general" && (
          <form
            onSubmit={saveSettings}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 max-w-2xl"
          >
            <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-1">Company Info</h2>
            <p className="text-sm text-gray-500 mb-5">Shown in the admin header and on PDF exports.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={draft.companyName}
                  onChange={(e) => setDraft({ ...draft, companyName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time Zone</label>
                <input
                  type="text"
                  value="Asia/Riyadh (Saudi Arabia)"
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Fixed to Asia/Riyadh. Changing this requires a server restart.
                </p>
              </div>
            </div>
            {renderSaveBar()}
          </form>
        )}

        {section === "hours" && (
          <form
            onSubmit={saveSettings}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 max-w-2xl"
          >
            <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-1">Working Hours</h2>
            <p className="text-sm text-gray-500 mb-5">
              Default times applied to employees who don't have a custom schedule.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Check-In Time
                </label>
                <input
                  type="time"
                  value={draft.defaultMorningStart}
                  onChange={(e) => setDraft({ ...draft, defaultMorningStart: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Late threshold applies after this time.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Late Grace Period (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={draft.lateThresholdMinutes}
                  onChange={(e) => setDraft({ ...draft, lateThresholdMinutes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Arrivals within this many minutes after check-in time count as on-time.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Evening Check-Out Reminder
                </label>
                <input
                  type="time"
                  value={draft.defaultAfternoonEnd}
                  onChange={(e) => setDraft({ ...draft, defaultAfternoonEnd: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Sound reminder plays at this time on the kiosk.
                </p>
              </div>
            </div>
            {renderSaveBar()}
          </form>
        )}

        {section === "roles" && (
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
                        onClick={() => saveRoleEdit(r.value)}
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
                        onClick={() => removeRole(r.value)}
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
                  onClick={addRole}
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
        )}

        {section === "security" && (
          <div className="space-y-4 max-w-2xl">
            <form
              onSubmit={changePassword}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6"
            >
              <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-1">Admin Password</h2>
              <p className="text-sm text-gray-500 mb-5">
                {settings?.hasCustomAdminPassword
                  ? "A custom admin password is currently active."
                  : "Currently using the default password. Change it to secure your dashboard."}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={pwForm.current}
                    onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    autoComplete="current-password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={pwForm.next}
                    onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-gray-500 mt-1">At least 6 characters.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={pwForm.confirm}
                    onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    autoComplete="new-password"
                  />
                </div>

                {pwMsg && (
                  <div
                    className={`text-sm rounded-lg px-3 py-2 ${
                      pwMsg.kind === "ok"
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {pwMsg.text}
                  </div>
                )}

                <div className="pt-2 border-t flex justify-end">
                  <button
                    type="submit"
                    disabled={pwSaving}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {pwSaving ? "Saving..." : "Change Password"}
                  </button>
                </div>
              </div>
            </form>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
              <h3 className="text-base font-bold text-gray-900 mb-2">Public Leave Request Link</h3>
              <p className="text-sm text-gray-500 mb-3">
                Share this link with employees so they can submit leave requests from their phones.
                They'll be asked for their employee ID and PIN to verify identity.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}${import.meta.env.BASE_URL}leave-request`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono bg-gray-50"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}${import.meta.env.BASE_URL}leave-request`;
                    navigator.clipboard?.writeText(url);
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  function renderSaveBar() {
    return (
      <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm">
          {savedAt && <span className="text-green-600 font-medium">✓ Saved</span>}
          {isDirty && !savedAt && <span className="text-amber-600">Unsaved changes</span>}
        </div>
        <div className="flex gap-2 sm:ml-auto">
          <button
            type="button"
            onClick={() => settings && setDraft(settings)}
            disabled={!isDirty || saving}
            className="flex-1 sm:flex-initial px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium disabled:opacity-40"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={!isDirty || saving}
            className="flex-1 sm:flex-initial px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    );
  }
}
