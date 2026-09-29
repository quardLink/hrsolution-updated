import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { useAdminApi } from "../../../contexts/AdminApiContext";

interface DeviceInfo {
  id: string;
  pairedAt: string;
  lastSeenAt: string | null;
}

// Shown only when editing an existing employee (pairing needs a real
// employee code to scope the code to) — generates a short-lived pairing
// code for the employee's OWN phone, distinct from the shared kiosk
// pairing in Settings → Devices. See lib/devices.ts's employeeCode
// handling for why a new code here revokes whatever phone was paired
// before ("one paired phone per employee").
export default function RemoteDevicePairing({ employeeId }: { employeeId: string }) {
  const { t, locale } = useLocale();
  const { baseUrl, onError } = useAdminApi();
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const dateLocale = locale === "ar" ? "ar-SA" : "en-US";

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/employees/${employeeId}/device`, { credentials: "include" });
      if (res.ok) setDevice((await res.json()).device);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  async function generateCode() {
    setGenerating(true);
    setCode(null);
    try {
      const res = await fetch(`${baseUrl}/api/admin/employees/${employeeId}/pairing-code`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        onError(t("employees.remotePairFailed"));
        return;
      }
      const data = await res.json();
      setCode(data.code);
    } finally {
      setGenerating(false);
    }
  }

  async function revoke() {
    if (!confirm(t("employees.remoteRevokeConfirm"))) return;
    await fetch(`${baseUrl}/api/admin/employees/${employeeId}/device`, { method: "DELETE", credentials: "include" });
    setCode(null);
    await load();
  }

  return (
    <div className="space-y-1.5">
      <Label>{t("employees.remoteDeviceTitle")}</Label>
      <p className="text-xs text-muted-foreground">{t("employees.remoteDeviceHint")}</p>

      {loading ? (
        <div className="text-xs text-muted-foreground">{t("common.loading")}</div>
      ) : device ? (
        <div className="flex items-center justify-between gap-3 border rounded-lg px-3 py-2">
          <div className="text-xs text-muted-foreground">
            {t("employees.remotePaired")} {new Date(device.pairedAt).toLocaleDateString(dateLocale)}
            {device.lastSeenAt && ` · ${t("employees.remoteLastSeen")} ${new Date(device.lastSeenAt).toLocaleString(dateLocale)}`}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={revoke} className="text-destructive hover:text-destructive shrink-0">
            {t("employees.remoteRevoke")}
          </Button>
        </div>
      ) : code ? (
        <div className="border rounded-lg px-3 py-3 text-center space-y-1">
          <div className="text-2xl font-bold font-mono tracking-widest">{code}</div>
          <p className="text-xs text-muted-foreground">{t("employees.remoteCodeHint")}</p>
        </div>
      ) : (
        <Button type="button" variant="secondary" size="sm" onClick={generateCode} disabled={generating}>
          {generating ? t("employees.remoteGenerating") : t("employees.remoteGenerateCode")}
        </Button>
      )}
    </div>
  );
}
