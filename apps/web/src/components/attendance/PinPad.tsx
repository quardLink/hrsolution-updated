import { Delete } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";

interface Props {
  onDigit: (digit: string) => void;
  onClear: () => void;
  onBackspace: () => void;
  digitsDisabled: boolean;
}

export default function PinPad({ onDigit, onClear, onBackspace, digitsDisabled }: Props) {
  const { t, dir } = useLocale();
  return (
    <div className="grid grid-cols-3 gap-3">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
        <button
          key={d}
          onClick={() => onDigit(d)}
          disabled={digitsDisabled}
          className="h-16 rounded-2xl bg-secondary/50 dark:bg-secondary/25 glass text-foreground font-bold text-xl shadow-sm shadow-black/5 dark:shadow-black/20 hover:bg-primary/15 hover:text-primary active:scale-95 transition-all disabled:opacity-50"
        >
          {d}
        </button>
      ))}
      <button
        onClick={onClear}
        className="h-16 rounded-2xl bg-secondary/50 dark:bg-secondary/25 glass text-muted-foreground font-semibold text-sm shadow-sm shadow-black/5 dark:shadow-black/20 hover:bg-destructive/10 hover:text-destructive active:scale-95 transition-all"
      >
        {t("kiosk.clear")}
      </button>
      <button
        onClick={() => onDigit("0")}
        disabled={digitsDisabled}
        className="h-16 rounded-2xl bg-secondary/50 dark:bg-secondary/25 glass text-foreground font-bold text-xl shadow-sm shadow-black/5 dark:shadow-black/20 hover:bg-primary/15 hover:text-primary active:scale-95 transition-all disabled:opacity-50"
      >
        0
      </button>
      <button
        onClick={onBackspace}
        className="h-16 rounded-2xl bg-secondary/50 dark:bg-secondary/25 glass text-muted-foreground font-semibold text-lg shadow-sm shadow-black/5 dark:shadow-black/20 hover:bg-secondary active:scale-95 transition-all flex items-center justify-center"
      >
        <Delete className={`w-5 h-5 ${dir === "rtl" ? "scale-x-[-1]" : ""}`} />
      </button>
    </div>
  );
}
