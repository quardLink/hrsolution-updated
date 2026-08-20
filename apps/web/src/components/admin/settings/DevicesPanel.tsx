import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { useAdminApi } from "../../../contexts/AdminApiContext";
import { adminFetch, toErrorMessage } from "../../../lib/adminApi";

interface Device {
  id: string;
  name: string;
  userAgent: string | null;
  pairedIp: string | null;
  pairedLocation: string | null;
  lastSeenIp: string | null;
  pairedAt: string;
  lastSeenAt: string | null;
}

interface PairingCode {
  code: string;
  expiresAt: string;
}

// Small best-effort UA parser — just enough to tell devices apart at a
// glance ("Chrome on Windows"), not meant to be exhaustive.
function describeUserAgent(ua: string | null, unknownLabel: string): string {
  if (!ua) return unknownLabel;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return os ? `${browser} on ${os}` : browser;
}

export default function DevicesPanel() {
  const { t, locale, dict } = useLocale();
  const { baseUrl, onError } = useAdminApi();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceName, setDeviceName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [pairing, setPairing] = useState<PairingCode | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const data = await adminFetch<{ devices: Device[] }>(baseUrl, "/api/admin/devices", {
        errorMessage: "Failed to load devices",
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

  useEffect(() => {
    if (!pairing) return;
    const tick = () => {
      const left = Math.max(0, Math.round((new Date(pairing.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) setPairing(null);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [pairing]);

  async function generateCode() {
    setGenerating(true);
    try {
      const data = await adminFetch<PairingCode>(baseUrl, "/api/admin/devices/pairing-code", {
        method: "POST",
        body: deviceName.trim() ? { name: deviceName.trim() } : undefined,
        errorMessage: "Failed to generate code",
      });
      setPairing(data);
      setDeviceName("");
    } catch (err) {
      onError(toErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  }

  async function revoke(id: string, name: string) {
    if (!confirm(dict.settings.devicesRevokeConfirm(name))) return;
    try {
      await adminFetch(baseUrl, `/api/admin/devices/${id}`, {
        method: "DELETE",
        errorMessage: "Failed to revoke device",
      });
      await load();
    } catch (err) {
      onError(toErrorMessage(err));
    }
  }

  const dateLocale = locale === "ar" ? "ar-SA" : "en-US";

  return (
    <div className="space-y-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.devicesTitle")}</CardTitle>
          <CardDescription>{t("settings.devicesSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {pairing ? (
            <div className="text-center py-6 bg-background border rounded-xl">
              <p className="text-xs text-muted-foreground mb-2">{t("settings.devicesEnterCode")}</p>
              <p className="text-4xl font-bold tracking-[0.3em] font-mono">{pairing.code}</p>
              <p className="text-xs text-muted-foreground mt-3">{t("settings.devicesExpiresIn")} {secondsLeft}s</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder={t("settings.devicesNamePlaceholder")}
              />
              <Button onClick={generateCode} disabled={generating} className="w-full" size="lg">
                {generating ? t("settings.devicesGenerating") : t("settings.devicesGenerate")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("settings.devicesPaired")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-6 text-muted-foreground text-sm">{t("common.loading")}</div>
          ) : devices.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">{t("settings.devicesNone")}</div>
          ) : (
            <div className="divide-y">
              {devices.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{d.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {describeUserAgent(d.userAgent, t("settings.devicesUnknown"))}
                      {(d.pairedLocation || d.pairedIp) && ` · ${t("settings.devicesPairedFrom")} ${d.pairedLocation || d.pairedIp}`}
                    </div>
                    <div className="text-xs text-muted-foreground/70 mt-0.5">
                      {t("settings.devicesPairedOn")} {new Date(d.pairedAt).toLocaleDateString(dateLocale)}
                      {d.lastSeenAt && ` · ${t("settings.devicesLastSeen")} ${new Date(d.lastSeenAt).toLocaleString(dateLocale)}`}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revoke(d.id, d.name)}
                    className="text-red-500 hover:text-red-500 shrink-0"
                  >
                    {t("settings.devicesRevoke")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
