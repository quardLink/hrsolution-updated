import { useEffect, useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { useAdminApi } from "../../../contexts/AdminApiContext";
import { adminFetch, toErrorMessage } from "../../../lib/adminApi";

interface BiometricDevice {
  id: string;
  serialNumber: string;
  name: string;
  lastSeenIp: string | null;
  lastSeenAt: string | null;
  clockOffsetMs: number | null;
  registeredAt: string;
}

// Terminals check in every 30s or so while online (Delay=30 in our
// handshake reply) — "idle" covers a normal gap between visits (e.g. no
// punches overnight) without immediately reading as broken.
const ONLINE_WITHIN_MS = 5 * 60 * 1000;
const IDLE_WITHIN_MS = 24 * 60 * 60 * 1000;

function deviceStatus(lastSeenAt: string | null): "online" | "idle" | "offline" {
  if (!lastSeenAt) return "offline";
  const age = Date.now() - new Date(lastSeenAt).getTime();
  if (age <= ONLINE_WITHIN_MS) return "online";
  if (age <= IDLE_WITHIN_MS) return "idle";
  return "offline";
}

export default function BiometricDevicesPanel() {
  const { t, locale, dict } = useLocale();
  const { baseUrl, onError } = useAdminApi();
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [serialNumber, setSerialNumber] = useState("");
  const [name, setName] = useState("");
  const [registering, setRegistering] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await adminFetch<{ devices: BiometricDevice[] }>(baseUrl, "/api/admin/biometric-devices", {
        errorMessage: "Failed to load fingerprint terminals",
      });
      setDevices(data.devices);
    } catch (err) {
      onError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function register() {
    if (!serialNumber.trim()) return;
    setRegistering(true);
    try {
      await adminFetch(baseUrl, "/api/admin/biometric-devices", {
        method: "POST",
        body: { serialNumber: serialNumber.trim(), name: name.trim() || undefined },
        errorMessage: "Failed to register device",
      });
      setSerialNumber("");
      setName("");
      await load();
    } catch (err) {
      onError(toErrorMessage(err));
    } finally {
      setRegistering(false);
    }
  }

  async function revoke(id: string, deviceName: string) {
    if (!confirm(dict.settings.biometricRevokeConfirm(deviceName))) return;
    try {
      await adminFetch(baseUrl, `/api/admin/biometric-devices/${id}`, {
        method: "DELETE",
        errorMessage: "Failed to remove device",
      });
      await load();
    } catch (err) {
      onError(toErrorMessage(err));
    }
  }

  function startRename(d: BiometricDevice) {
    setRenamingId(d.id);
    setRenameValue(d.name);
  }

  async function saveRename(id: string) {
    const newName = renameValue.trim();
    if (!newName) return;
    try {
      await adminFetch(baseUrl, `/api/admin/biometric-devices/${id}`, {
        method: "PATCH",
        body: { name: newName },
        errorMessage: "Failed to rename device",
      });
      setRenamingId(null);
      await load();
    } catch (err) {
      onError(toErrorMessage(err));
    }
  }

  const dateLocale = locale === "ar" ? "ar-SA" : "en-US";

  function formatDrift(offsetMs: number | null): string {
    if (offsetMs === null) return dict.settings.biometricClockUncalibrated;
    const absMs = Math.abs(offsetMs);
    if (absMs < 60_000) return dict.settings.biometricClockSynced;
    const totalMinutes = Math.round(absMs / 60_000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const amount = [hours > 0 ? `${hours}h` : null, minutes > 0 ? `${minutes}m` : null].filter(Boolean).join(" ");
    return offsetMs < 0 ? dict.settings.biometricClockFast(amount) : dict.settings.biometricClockSlow(amount);
  }

  const statusStyles: Record<ReturnType<typeof deviceStatus>, string> = {
    online: "bg-success/15 text-success",
    idle: "bg-muted text-muted-foreground",
    offline: "bg-destructive/15 text-destructive",
  };
  const statusLabels: Record<ReturnType<typeof deviceStatus>, string> = {
    online: dict.settings.biometricStatusOnline,
    idle: dict.settings.biometricStatusIdle,
    offline: dict.settings.biometricStatusOffline,
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.biometricTitle")}</CardTitle>
          <CardDescription>{t("settings.biometricSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Input
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder={t("settings.biometricSerialPlaceholder")}
              className="font-mono"
            />
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("settings.biometricNamePlaceholder")} />
            <Button onClick={register} disabled={registering || !serialNumber.trim()} className="w-full" size="lg">
              {registering ? t("settings.biometricRegistering") : t("settings.biometricRegister")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("settings.biometricRegistered")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-6 text-muted-foreground text-sm">{t("common.loading")}</div>
          ) : devices.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">{t("settings.biometricNone")}</div>
          ) : (
            <div className="divide-y">
              {devices.map((d) => {
                const status = deviceStatus(d.lastSeenAt);
                return (
                <div key={d.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="min-w-0">
                    {renamingId === d.id ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && saveRename(d.id)}
                          autoFocus
                          className="h-7 text-sm"
                        />
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => saveRename(d.id)}>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => setRenamingId(null)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-sm">{d.name}</div>
                        <button onClick={() => startRename(d)} className="text-muted-foreground hover:text-primary opacity-60 hover:opacity-100">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusStyles[status]}`}>
                          {statusLabels[status]}
                        </span>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground font-mono">{d.serialNumber}</div>
                    <div className="text-xs text-muted-foreground/70 mt-0.5">
                      {t("settings.biometricRegisteredOn")} {new Date(d.registeredAt).toLocaleDateString(dateLocale)}
                      {" · "}
                      {d.lastSeenAt
                        ? `${t("settings.biometricLastSeen")} ${new Date(d.lastSeenAt).toLocaleString(dateLocale)}`
                        : t("settings.biometricNeverSeen")}
                    </div>
                    <div className="text-xs text-muted-foreground/70 mt-0.5">{formatDrift(d.clockOffsetMs)}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revoke(d.id, d.name)}
                    className="text-red-500 hover:text-red-500 shrink-0"
                  >
                    {t("settings.biometricRevoke")}
                  </Button>
                </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
