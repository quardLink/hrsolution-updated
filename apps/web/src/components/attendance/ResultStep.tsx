import { CheckCircle2 } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import type { TranslationKey } from "../../lib/i18n";

interface Props {
  sessionLabel: TranslationKey;
  employeeName: string;
  timestamp: string;
  onDone: () => void;
}

export default function ResultStep({ sessionLabel, employeeName, timestamp, onDone }: Props) {
  const { t } = useLocale();
  return (
    <div className="w-full max-w-sm space-y-5">
      <div className="bg-card border border-border rounded-2xl p-8 shadow-xl text-center space-y-5">
        <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>

        <div>
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
            {t(sessionLabel)}
          </p>
          <h3 className="text-2xl font-bold text-foreground mt-1">{employeeName}</h3>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
          <p className="text-emerald-400 text-sm font-semibold">{t("kiosk.recordedSuccess")}</p>
        </div>

        <div className="text-muted-foreground text-xs">
          {t("kiosk.loggedAt")} {timestamp}
        </div>

        <p className="text-muted-foreground text-xs">{t("kiosk.returningHome")}</p>
      </div>

      <button
        onClick={onDone}
        className="w-full bg-card border border-border rounded-2xl py-4 text-foreground font-semibold hover:border-primary/50 transition-colors"
      >
        {t("kiosk.doneReturn")}
      </button>
    </div>
  );
}
