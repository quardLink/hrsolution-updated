import { useLocale } from "@/contexts/LocaleContext";
import type { Step } from "../../hooks/useAttendanceWizard";
import type { TranslationKey } from "../../lib/i18n";

const STEPS: { id: Step; labelKey: TranslationKey }[] = [
  { id: "action", labelKey: "kiosk.stepSelect" },
  { id: "employee", labelKey: "kiosk.stepIdentify" },
  { id: "face", labelKey: "kiosk.stepFace" },
  { id: "pin", labelKey: "kiosk.stepPin" },
  { id: "result", labelKey: "kiosk.stepDone" },
];

export default function StepProgress({ step }: { step: Step }) {
  const { t } = useLocale();
  const currentIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="flex items-center gap-2">
      {STEPS.map((s, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={s.id} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  done || active ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              />
              <span
                className={`text-xs font-medium transition-colors hidden sm:inline ${
                  active ? "text-foreground" : "text-muted-foreground/60"
                }`}
              >
                {t(s.labelKey)}
              </span>
            </div>
            {i < STEPS.length - 1 && <div className="w-4 sm:w-6 h-px bg-border" />}
          </div>
        );
      })}
    </div>
  );
}
