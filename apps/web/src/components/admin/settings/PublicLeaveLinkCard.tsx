import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { useAdminApi } from "../../../contexts/AdminApiContext";

export default function PublicLeaveLinkCard() {
  const { t } = useLocale();
  const { baseUrl } = useAdminApi();
  const [orgSlug, setOrgSlug] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${baseUrl}/api/auth/me`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setOrgSlug(data.org?.slug ?? null))
      .catch(() => {});
  }, [baseUrl]);

  const link =
    orgSlug && typeof window !== "undefined"
      ? `${window.location.origin}${import.meta.env.BASE_URL}leave-request/${orgSlug}`
      : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("settings.leaveLinkTitle")}</CardTitle>
        <CardDescription>{t("settings.leaveLinkSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input readOnly value={link} className="flex-1 font-mono text-foreground/80" onFocus={(e) => e.currentTarget.select()} />
          <Button type="button" variant="secondary" disabled={!link} onClick={() => navigator.clipboard?.writeText(link)}>
            {t("settings.copy")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
