import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/contexts/LocaleContext";
import { useAdminApi } from "../../../contexts/AdminApiContext";
import type { OfficeSettings } from "../../../hooks/useSettingsForm";
import SettingsSaveBar from "./SettingsSaveBar";

interface Props {
  draft: OfficeSettings;
  onChange: (next: OfficeSettings) => void;
  onSubmit: (e: React.FormEvent) => void;
  isDirty: boolean;
  saving: boolean;
  savedAt: number | null;
  onReset: () => void;
}

interface GeofenceSite {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export default function SettingsRemoteCheckInPanel({ draft, onChange, onSubmit, isDirty, saving, savedAt, onReset }: Props) {
  const { t } = useLocale();
  const { baseUrl, onError } = useAdminApi();
  const [sites, setSites] = useState<GeofenceSite[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [newSite, setNewSite] = useState({ name: "", latitude: "", longitude: "", radiusMeters: "200" });
  const [addingSite, setAddingSite] = useState(false);

  async function loadSites() {
    setLoadingSites(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/geofence-sites`, { credentials: "include" });
      if (res.ok) setSites((await res.json()).sites ?? []);
    } finally {
      setLoadingSites(false);
    }
  }

  useEffect(() => {
    loadSites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addSite() {
    const latitude = Number(newSite.latitude);
    const longitude = Number(newSite.longitude);
    if (!newSite.name.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      onError(t("settings.remoteGeofenceInvalid"));
      return;
    }
    setAddingSite(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/geofence-sites`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSite.name.trim(),
          latitude,
          longitude,
          radiusMeters: Number(newSite.radiusMeters) || 200,
        }),
      });
      if (!res.ok) {
        onError(t("settings.remoteGeofenceAddFailed"));
        return;
      }
      setNewSite({ name: "", latitude: "", longitude: "", radiusMeters: "200" });
      await loadSites();
    } finally {
      setAddingSite(false);
    }
  }

  async function removeSite(id: string) {
    await fetch(`${baseUrl}/api/admin/geofence-sites/${id}`, { method: "DELETE", credentials: "include" });
    await loadSites();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.remoteTitle")}</CardTitle>
          <CardDescription>{t("settings.remoteSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("settings.remoteMode")}</Label>
            <Select value={draft.remoteCheckInMode} onValueChange={(v) => onChange({ ...draft, remoteCheckInMode: v as OfficeSettings["remoteCheckInMode"] })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="disabled">{t("settings.remoteModeDisabled")}</SelectItem>
                <SelectItem value="requires_approval">{t("settings.remoteModeRequiresApproval")}</SelectItem>
                <SelectItem value="auto_approve">{t("settings.remoteModeAutoApprove")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {draft.remoteCheckInMode === "disabled" && t("settings.remoteModeDisabledHint")}
              {draft.remoteCheckInMode === "requires_approval" && t("settings.remoteModeRequiresApprovalHint")}
              {draft.remoteCheckInMode === "auto_approve" && t("settings.remoteModeAutoApproveHint")}
            </p>
          </div>

          {draft.remoteCheckInMode === "auto_approve" && (
            <div className="flex items-center justify-between gap-4 pt-3 border-t">
              <div className="space-y-0.5">
                <Label htmlFor="require-geofence">{t("settings.remoteRequireGeofence")}</Label>
                <p className="text-xs text-muted-foreground">{t("settings.remoteRequireGeofenceHint")}</p>
              </div>
              <Switch
                id="require-geofence"
                checked={draft.remoteCheckInRequireGeofence}
                onCheckedChange={(checked) => onChange({ ...draft, remoteCheckInRequireGeofence: checked })}
              />
            </div>
          )}

          <div className="space-y-1.5 pt-3 border-t">
            <Label>{t("settings.remoteExpiryHours")}</Label>
            <Input
              type="number"
              min="1"
              className="w-32"
              value={draft.remoteCheckInExpiryHours}
              onChange={(e) => onChange({ ...draft, remoteCheckInExpiryHours: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">{t("settings.remoteExpiryHoursHint")}</p>
          </div>
        </CardContent>
      </Card>

      {draft.remoteCheckInMode === "auto_approve" && draft.remoteCheckInRequireGeofence && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("settings.remoteSitesTitle")}</CardTitle>
            <CardDescription>{t("settings.remoteSitesSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingSites ? (
              <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
            ) : sites.length === 0 ? (
              <div className="text-sm text-muted-foreground">{t("settings.remoteSitesNone")}</div>
            ) : (
              <div className="divide-y">
                {sites.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-2.5 gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{s.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {s.latitude}, {s.longitude} · {s.radiusMeters}m
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeSite(s.id)} className="text-destructive hover:text-destructive shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t">
              <Input placeholder={t("settings.remoteSiteName")} value={newSite.name} onChange={(e) => setNewSite({ ...newSite, name: e.target.value })} className="col-span-2 sm:col-span-1" />
              <Input placeholder={t("settings.remoteSiteLat")} inputMode="decimal" value={newSite.latitude} onChange={(e) => setNewSite({ ...newSite, latitude: e.target.value })} />
              <Input placeholder={t("settings.remoteSiteLng")} inputMode="decimal" value={newSite.longitude} onChange={(e) => setNewSite({ ...newSite, longitude: e.target.value })} />
              <Input placeholder={t("settings.remoteSiteRadius")} inputMode="numeric" value={newSite.radiusMeters} onChange={(e) => setNewSite({ ...newSite, radiusMeters: e.target.value })} />
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={addSite} disabled={addingSite}>
              {t("settings.remoteSiteAdd")}
            </Button>
            <p className="text-xs text-muted-foreground/70">{t("settings.remoteSiteLatLngHint")}</p>
          </CardContent>
        </Card>
      )}

      <SettingsSaveBar isDirty={isDirty} saving={saving} savedAt={savedAt} onReset={onReset} />
    </form>
  );
}
