import { ArrowLeft } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import PinPad from "./PinPad";

interface Props {
  employeeName: string | undefined;
  pin: string;
  pinError: string;
  isSubmitting: boolean;
  onBack: () => void;
  onDigit: (digit: string) => void;
  onClear: () => void;
  onBackspace: () => void;
}

export default function PinStep({ employeeName, pin, pinError, isSubmitting, onBack, onDigit, onClear, onBackspace }: Props) {
  const { t, dir } = useLocale();
  return (
    <div className="w-full max-w-sm space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-foreground hover:border-primary/50 transition-colors"
        >
          <ArrowLeft className={`w-4 h-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-foreground">{t("kiosk.enterPin")}</h2>
          <p className="text-muted-foreground text-sm">{employeeName}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-7 shadow-xl space-y-6">
        <div className="flex justify-center gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-13 h-13 rounded-xl border-2 flex items-center justify-center text-xl font-bold transition-all duration-150 ${
                i < pin.length
                  ? "bg-primary border-primary text-primary-foreground scale-105"
                  : "bg-muted border-border text-muted-foreground"
              }`}
            >
              {i < pin.length ? "•" : ""}
            </div>
          ))}
        </div>

        {pinError && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-red-400 text-sm text-center font-medium">
            {pinError}
          </div>
        )}

        <PinPad onDigit={onDigit} onClear={onClear} onBackspace={onBackspace} digitsDisabled={isSubmitting} />

        {isSubmitting && (
          <div className="text-center text-primary text-sm font-medium animate-pulse">
            {t("kiosk.verifying")}
          </div>
        )}
      </div>
    </div>
  );
}
