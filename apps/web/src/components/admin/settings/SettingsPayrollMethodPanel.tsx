import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function SettingsPayrollMethodPanel({ draft, onChange, onSubmit, isDirty, saving, savedAt, onReset }: Props) {
  const { t } = useLocale();

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.payrollMethodTitle")}</CardTitle>
          <CardDescription>{t("settings.payrollMethodSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("settings.payrollMethodLabel")}</Label>
            <Select value={draft.payrollMethod} onValueChange={(v) => onChange({ ...draft, payrollMethod: v as OfficeSettings["payrollMethod"] })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">{t("settings.payrollMethodHourly")}</SelectItem>
                <SelectItem value="daily">{t("settings.payrollMethodDaily")}</SelectItem>
                <SelectItem value="hybrid">{t("settings.payrollMethodHybrid")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {draft.payrollMethod === "hourly" && t("settings.payrollMethodHourlyHint")}
              {draft.payrollMethod === "daily" && t("settings.payrollMethodDailyHint")}
              {draft.payrollMethod === "hybrid" && t("settings.payrollMethodHybridHint")}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("settings.payrollRatesTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("settings.payrollDailyRateBasis")}</Label>
              <Select
                value={draft.payrollDailyRateBasis}
                onValueChange={(v) => onChange({ ...draft, payrollDailyRateBasis: v as OfficeSettings["payrollDailyRateBasis"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed_30">{t("settings.payrollDailyRateBasisFixed")}</SelectItem>
                  <SelectItem value="actual_days">{t("settings.payrollDailyRateBasisActual")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("settings.payrollStandardDailyHours")}</Label>
              <Input
                type="number"
                min="1"
                max="24"
                value={draft.payrollStandardDailyHours}
                onChange={(e) => onChange({ ...draft, payrollStandardDailyHours: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("settings.payrollOtTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("settings.payrollOtStartsAfter")}</Label>
              <Input
                type="number"
                min="0"
                value={draft.payrollOtStartsAfterMinutes}
                onChange={(e) => onChange({ ...draft, payrollOtStartsAfterMinutes: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("settings.payrollOtMultiplier")}</Label>
              <Input
                type="number"
                min="1"
                step="0.1"
                value={draft.payrollOtMultiplier}
                onChange={(e) => onChange({ ...draft, payrollOtMultiplier: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("settings.payrollRoundingBlock")}</Label>
              <Select
                value={draft.payrollRoundingBlockMinutes}
                onValueChange={(v) => onChange({ ...draft, payrollRoundingBlockMinutes: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 {t("settings.minutes")}</SelectItem>
                  <SelectItem value="5">5 {t("settings.minutes")}</SelectItem>
                  <SelectItem value="15">15 {t("settings.minutes")}</SelectItem>
                  <SelectItem value="30">30 {t("settings.minutes")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-3 border-t">
            <div className="space-y-0.5">
              <Label htmlFor="weekend-ot">{t("settings.payrollWeekendOt")}</Label>
              <p className="text-xs text-muted-foreground">{t("settings.payrollWeekendOtHint")}</p>
            </div>
            <Switch
              id="weekend-ot"
              checked={draft.payrollWeekendHolidayPaidAsOvertime}
              onCheckedChange={(checked) => onChange({ ...draft, payrollWeekendHolidayPaidAsOvertime: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("settings.payrollDailyMethodTitle")}</CardTitle>
          <CardDescription>{t("settings.payrollDailyMethodSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>{t("settings.payrollFullDayMinHours")}</Label>
              <Input
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={draft.payrollFullDayMinHours}
                onChange={(e) => onChange({ ...draft, payrollFullDayMinHours: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("settings.payrollHalfDayMinHours")}</Label>
              <Input
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={draft.payrollHalfDayMinHours}
                onChange={(e) => onChange({ ...draft, payrollHalfDayMinHours: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("settings.payrollMaxLateBeforeHalfDay")}</Label>
              <Input
                type="number"
                min="0"
                value={draft.payrollMaxLateMinutesBeforeHalfDay}
                onChange={(e) => onChange({ ...draft, payrollMaxLateMinutesBeforeHalfDay: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("settings.payrollMissingCheckout")}</Label>
            <Select
              value={draft.payrollMissingCheckoutHandling}
              onValueChange={(v) => onChange({ ...draft, payrollMissingCheckoutHandling: v as OfficeSettings["payrollMissingCheckoutHandling"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hr_review">{t("settings.payrollMissingCheckoutReview")}</SelectItem>
                <SelectItem value="half_day">{t("settings.payrollMissingCheckoutHalfDay")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <SettingsSaveBar isDirty={isDirty} saving={saving} savedAt={savedAt} onReset={onReset} />
    </form>
  );
}
