import { useState } from "react";
import { useSettingsForm } from "../../hooks/useSettingsForm";
import { useRoles } from "../../hooks/useRoles";
import SettingsGeneralPanel from "./settings/SettingsGeneralPanel";
import SettingsHoursPanel from "./settings/SettingsHoursPanel";
import SettingsRolesPanel from "./settings/SettingsRolesPanel";
import ChangePasswordCard from "./settings/ChangePasswordCard";
import PublicLeaveLinkCard from "./settings/PublicLeaveLinkCard";
import DevicesPanel from "./settings/DevicesPanel";

type Section = "general" | "hours" | "roles" | "devices" | "security";

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: "general", label: "General", icon: "🏢" },
  { id: "hours", label: "Working Hours", icon: "🕒" },
  { id: "roles", label: "Roles", icon: "🏷️" },
  { id: "devices", label: "Kiosk Devices", icon: "📱" },
  { id: "security", label: "Security", icon: "🔒" },
];

export default function SettingsTab() {
  const [section, setSection] = useState<Section>("general");
  const { draft, setDraft, loading, saving, savedAt, isDirty, save, reset } = useSettingsForm();
  const { roles, addRole, saveRoleEdit, removeRole } = useRoles();

  if (loading || !draft) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="text-center py-8 text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4 lg:gap-6">
      {/* Section nav */}
      <nav className="bg-card rounded-xl border border-border p-2 lg:p-3 h-fit lg:sticky lg:top-4">
        <div className="flex lg:flex-col gap-1 overflow-x-auto">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                section === s.id
                  ? "bg-primary/15 text-indigo-300"
                  : "text-muted-foreground hover:bg-muted"
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
          <SettingsGeneralPanel
            draft={draft}
            onChange={setDraft}
            onSubmit={save}
            isDirty={isDirty}
            saving={saving}
            savedAt={savedAt}
            onReset={reset}
          />
        )}

        {section === "hours" && (
          <SettingsHoursPanel
            draft={draft}
            onChange={setDraft}
            onSubmit={save}
            isDirty={isDirty}
            saving={saving}
            savedAt={savedAt}
            onReset={reset}
          />
        )}

        {section === "roles" && (
          <SettingsRolesPanel roles={roles} onAdd={addRole} onSaveEdit={saveRoleEdit} onRemove={removeRole} />
        )}

        {section === "devices" && <DevicesPanel />}

        {section === "security" && (
          <div className="space-y-4 max-w-2xl">
            <ChangePasswordCard />
            <PublicLeaveLinkCard />
          </div>
        )}
      </div>
    </div>
  );
}
