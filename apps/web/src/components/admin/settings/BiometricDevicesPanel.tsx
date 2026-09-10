import { useEffect, useState } from "react";
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
  registeredAt: string;
}

export default function BiometricDevicesPanel() {
  const { t, locale, dict } = useLocale();
  const { baseUrl, onError } = useAdminApi();
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [serialNumber, setSerialNumber] = useState("");
  const [name, setName] = useState("");
  const [registering, setRegistering] = useState(false);

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

  const dateLocale = locale === "ar" ? "ar-SA" : "en-US";

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
              {devices.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{d.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{d.serialNumber}</div>
                    <div className="text-xs text-muted-foreground/70 mt-0.5">
                      {t("settings.biometricRegisteredOn")} {new Date(d.registeredAt).toLocaleDateString(dateLocale)}
                      {" · "}
                      {d.lastSeenAt
                        ? `${t("settings.biometricLastSeen")} ${new Date(d.lastSeenAt).toLocaleString(dateLocale)}`
                        : t("settings.biometricNeverSeen")}
                    </div>
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
