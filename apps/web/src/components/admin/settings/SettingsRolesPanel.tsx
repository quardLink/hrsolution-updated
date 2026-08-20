import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import type { Role } from "../../../hooks/useRoles";

interface Props {
  roles: Role[];
  onAdd: (value: string, label: string) => Promise<boolean>;
  onSaveEdit: (oldValue: string, label: string) => Promise<boolean>;
  onRemove: (value: string) => Promise<void>;
}

export default function SettingsRolesPanel({ roles, onAdd, onSaveEdit, onRemove }: Props) {
  const { t } = useLocale();
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
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{t("settings.rolesTitle")}</CardTitle>
        <CardDescription>{t("settings.rolesSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg divide-y mb-5">
          {roles.length === 0 && (
            <div className="px-4 py-6 text-center text-muted-foreground text-sm">{t("settings.rolesNone")}</div>
          )}
          {roles.map((r) => (
            <div key={r.value} className="px-4 py-3 flex items-center gap-3">
              {editingRole === r.value ? (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground font-mono mb-1">{r.value}</div>
                    <Input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="h-8"
                      autoFocus
                    />
                  </div>
                  <Button type="button" size="sm" onClick={() => handleSaveEdit(r.value)}>
                    {t("common.save")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setEditingRole(null); setEditLabel(""); }}
                  >
                    {t("common.cancel")}
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{r.label}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{r.value}</div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:text-primary"
                    onClick={() => { setEditingRole(r.value); setEditLabel(r.label); }}
                  >
                    {t("settings.rolesRename")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-500"
                    onClick={() => onRemove(r.value)}
                  >
                    {t("common.remove")}
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3 text-sm">{t("settings.rolesAddTitle")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
            <Input
              placeholder={t("settings.rolesDisplayNamePlaceholder")}
              value={roleDraft.label}
              onChange={(e) => setRoleDraft({ ...roleDraft, label: e.target.value })}
            />
            <Input
              placeholder={t("settings.rolesInternalKeyPlaceholder")}
              value={roleDraft.value}
              onChange={(e) => setRoleDraft({ ...roleDraft, value: e.target.value.toLowerCase() })}
              className="font-mono"
            />
            <Button type="button" onClick={handleAdd}>
              {t("common.add")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{t("settings.rolesHint")}</p>
        </div>
      </CardContent>
    </Card>
  );
}
