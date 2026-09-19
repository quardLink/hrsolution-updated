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

export default function SettingsHoursPanel({ draft, onChange, onSubmit, isDirty, saving, savedAt, onReset }: Props) {
  const { t } = useLocale();
  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.hoursTitle")}</CardTitle>
          <CardDescription>{t("settings.hoursSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("settings.checkInTime")}</Label>
              <Input
                type="time"
                value={draft.defaultMorningStart}
                onChange={(e) => onChange({ ...draft, defaultMorningStart: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">{t("settings.checkInTimeHint")}</p>
            </div>

            <div className="space-y-1.5">
              <Label>{t("settings.gracePeriod")}</Label>
              <Input
                type="number"
                min="0"
                max="120"
                value={draft.lateThresholdMinutes}
                onChange={(e) => onChange({ ...draft, lateThresholdMinutes: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">{t("settings.gracePeriodHint")}</p>
            </div>

            <div className="space-y-1.5">
              <Label>{t("settings.reminder")}</Label>
              <Input
                type="time"
                value={draft.defaultAfternoonEnd}
                onChange={(e) => onChange({ ...draft, defaultAfternoonEnd: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">{t("settings.reminderHint")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.payrollShiftTitle")}</CardTitle>
          <CardDescription>{t("settings.payrollShiftSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("settings.payrollShiftStart")}</Label>
              <Input
                type="time"
                value={draft.payrollShiftStart}
                onChange={(e) => onChange({ ...draft, payrollShiftStart: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("settings.payrollShiftEnd")}</Label>
              <Input
                type="time"
                value={draft.payrollShiftEnd}
                onChange={(e) => onChange({ ...draft, payrollShiftEnd: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("settings.payrollBreakStart")} ({t("common.optional")})</Label>
              <Input
                type="time"
                value={draft.payrollBreakStart}
                onChange={(e) => onChange({ ...draft, payrollBreakStart: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("settings.payrollBreakEnd")} ({t("common.optional")})</Label>
              <Input
                type="time"
                value={draft.payrollBreakEnd}
                onChange={(e) => onChange({ ...draft, payrollBreakEnd: e.target.value })}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">{t("settings.payrollBreakHint")}</p>
        </CardContent>
      </Card>

      <SettingsSaveBar isDirty={isDirty} saving={saving} savedAt={savedAt} onReset={onReset} />
    </form>
  );
}
