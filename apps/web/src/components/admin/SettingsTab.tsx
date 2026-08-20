import { useState } from "react";
import { Building2, Clock, Tag, Smartphone, Lock } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { useSettingsForm } from "../../hooks/useSettingsForm";
import { useRoles } from "../../hooks/useRoles";
import SettingsGeneralPanel from "./settings/SettingsGeneralPanel";
import SettingsHoursPanel from "./settings/SettingsHoursPanel";
import SettingsRolesPanel from "./settings/SettingsRolesPanel";
import ChangePasswordCard from "./settings/ChangePasswordCard";
import PublicLeaveLinkCard from "./settings/PublicLeaveLinkCard";
import DevicesPanel from "./settings/DevicesPanel";

type Section = "general" | "hours" | "roles" | "devices" | "security";

export default function SettingsTab() {
  const { t } = useLocale();
  const [section, setSection] = useState<Section>("general");
  const { draft, setDraft, loading, saving, savedAt, isDirty, save, reset } = useSettingsForm();
  const { roles, addRole, saveRoleEdit, removeRole } = useRoles();

  const SECTIONS: { id: Section; label: string; icon: typeof Building2 }[] = [
    { id: "general", label: t("settings.sectionGeneral"), icon: Building2 },
    { id: "hours", label: t("settings.sectionHours"), icon: Clock },
    { id: "roles", label: t("settings.sectionRoles"), icon: Tag },
    { id: "devices", label: t("settings.sectionDevices"), icon: Smartphone },
    { id: "security", label: t("settings.sectionSecurity"), icon: Lock },
  ];

  if (loading || !draft) {
    return (
      <div className="bg-card rounded-xl border p-6">
        <div className="text-center py-8 text-muted-foreground">{t("settings.loading")}</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl lg:text-2xl font-semibold tracking-tight mb-5">{t("nav.settings")}</h1>
      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4 lg:gap-6">
        <nav className="bg-card rounded-xl border p-2 lg:p-3 h-fit lg:sticky lg:top-20">
          <div className="flex lg:flex-col gap-1 overflow-x-auto">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  section === s.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <s.icon className="w-4 h-4" />
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </nav>

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
    </div>
  );
}
