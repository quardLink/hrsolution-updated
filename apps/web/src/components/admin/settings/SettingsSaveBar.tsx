import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";

interface Props {
  isDirty: boolean;
  saving: boolean;
  savedAt: number | null;
  onReset: () => void;
}

export default function SettingsSaveBar({ isDirty, saving, savedAt, onReset }: Props) {
  const { t } = useLocale();
  return (
    <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="text-sm">
        {savedAt && (
          <span className="text-emerald-500 font-medium inline-flex items-center gap-1">
            <Check className="w-4 h-4" /> {t("settings.saved")}
          </span>
        )}
        {isDirty && !savedAt && <span className="text-amber-500">{t("settings.unsaved")}</span>}
      </div>
      <div className="flex gap-2 sm:ms-auto">
        <Button type="button" variant="ghost" onClick={onReset} disabled={!isDirty || saving} className="flex-1 sm:flex-initial">
          {t("common.reset")}
        </Button>
        <Button type="submit" disabled={!isDirty || saving} className="flex-1 sm:flex-initial">
          {saving ? t("common.saving") : t("settings.saveSettings")}
        </Button>
      </div>
    </div>
  );
}
