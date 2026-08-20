import { Sunrise, Moon } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import type { Action } from "../../hooks/useAttendanceWizard";

export default function ActionStep({ onSelect }: { onSelect: (action: Action) => void }) {
  const { t } = useLocale();
  return (
    <div className="w-full max-w-3xl space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground">{t("kiosk.whatToDo")}</h2>
        <p className="text-muted-foreground mt-2">{t("kiosk.actionHint")}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <button
          onClick={() => onSelect("checkin")}
          className="group relative overflow-hidden bg-card rounded-2xl p-8 lg:p-10 shadow-xl border border-border hover:border-primary/50 hover:scale-[1.02] transition-all duration-200 cursor-pointer text-start"
        >
          <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-emerald-500/15 flex items-center justify-center mb-5">
            <Sunrise className="w-8 h-8 lg:w-10 lg:h-10 text-emerald-500" />
          </div>
          <div className="font-bold text-foreground text-2xl">{t("kiosk.checkIn")}</div>
          <div className="text-muted-foreground text-sm mt-1.5">{t("kiosk.checkInHint")}</div>
        </button>
        <button
          onClick={() => onSelect("checkout")}
          className="group relative overflow-hidden bg-card rounded-2xl p-8 lg:p-10 shadow-xl border border-border hover:border-primary/50 hover:scale-[1.02] transition-all duration-200 cursor-pointer text-start"
        >
          <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-primary/15 flex items-center justify-center mb-5">
            <Moon className="w-8 h-8 lg:w-10 lg:h-10 text-primary" />
          </div>
          <div className="font-bold text-foreground text-2xl">{t("kiosk.checkOut")}</div>
          <div className="text-muted-foreground text-sm mt-1.5">{t("kiosk.checkOutHint")}</div>
        </button>
      </div>
    </div>
  );
}
