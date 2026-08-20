import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { useAdminApi } from "../../../contexts/AdminApiContext";
import { adminFetch, toErrorMessage } from "../../../lib/adminApi";

export default function ChangePasswordCard() {
  const { t } = useLocale();
  const { baseUrl } = useAdminApi();
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (!pwForm.current || !pwForm.next) {
      setPwMsg({ kind: "err", text: t("settings.passwordFillAll") });
      return;
    }
    if (pwForm.next.length < 8) {
      setPwMsg({ kind: "err", text: t("settings.passwordTooShort") });
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ kind: "err", text: t("settings.passwordMismatch") });
      return;
    }
    setPwSaving(true);
    try {
      await adminFetch(baseUrl, "/api/auth/password", {
        method: "PATCH",
        body: { oldPassword: pwForm.current, newPassword: pwForm.next },
        errorMessage: "Failed to change password",
      });
      setPwMsg({ kind: "ok", text: t("settings.passwordChanged") });
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      setPwMsg({ kind: "err", text: toErrorMessage(err) });
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.passwordTitle")}</CardTitle>
        <CardDescription>{t("settings.passwordSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={changePassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("settings.currentPassword")}</Label>
            <Input
              type="password"
              value={pwForm.current}
              onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("settings.newPassword")}</Label>
            <Input
              type="password"
              value={pwForm.next}
              onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">{t("settings.newPasswordHint")}</p>
          </div>
          <div className="space-y-1.5">
            <Label>{t("settings.confirmPassword")}</Label>
            <Input
              type="password"
              value={pwForm.confirm}
              onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
              autoComplete="new-password"
            />
          </div>

          {pwMsg && (
            <div
              className={`text-sm rounded-lg px-3 py-2 ${
                pwMsg.kind === "ok" ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-red-500"
              }`}
            >
              {pwMsg.text}
            </div>
          )}

          <div className="pt-2 border-t flex justify-end">
            <Button type="submit" disabled={pwSaving}>
              {pwSaving ? t("common.saving") : t("settings.changePassword")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
