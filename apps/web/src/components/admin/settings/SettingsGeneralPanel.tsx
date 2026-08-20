import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/contexts/LocaleContext";
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

export default function SettingsGeneralPanel({ draft, onChange, onSubmit, isDirty, saving, savedAt, onReset }: Props) {
  const { t } = useLocale();
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{t("settings.generalTitle")}</CardTitle>
        <CardDescription>{t("settings.generalSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("settings.companyName")}</Label>
              <Input value={draft.companyName} onChange={(e) => onChange({ ...draft, companyName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("settings.timeZone")}</Label>
              <Input value="Asia/Riyadh (Saudi Arabia)" disabled />
              <p className="text-xs text-muted-foreground">{t("settings.timeZoneHint")}</p>
            </div>
          </div>
          <SettingsSaveBar isDirty={isDirty} saving={saving} savedAt={savedAt} onReset={onReset} />
        </form>
      </CardContent>
    </Card>
  );
}
