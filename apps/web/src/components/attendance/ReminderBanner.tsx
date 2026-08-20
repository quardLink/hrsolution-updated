import { Bell } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import type { Reminder } from "../../hooks/useCheckOutReminder";

export default function ReminderBanner({ reminder, onDismiss }: { reminder: Reminder; onDismiss: () => void }) {
  const { t } = useLocale();
  return (
    <div
      className="fixed top-0 start-0 end-0 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-4 shadow-2xl flex items-center justify-between gap-4"
      style={{ animation: "slideDown 0.4s ease-out, pulseGlow 1.5s ease-in-out infinite alternate" }}
    >
      <div className="flex items-center gap-3">
        <Bell className="w-7 h-7 animate-bounce shrink-0" />
        <div>
          <div className="font-bold text-lg">{reminder.label}</div>
          <div className="text-sm opacity-95">{reminder.message}</div>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium text-sm border border-white/30"
      >
        {t("kiosk.reminderDismiss")}
      </button>
      <style>{`
        @keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }
        @keyframes pulseGlow { from { box-shadow: 0 4px 20px rgba(251,146,60,0.5); } to { box-shadow: 0 4px 40px rgba(251,146,60,0.9); } }
      `}</style>
    </div>
  );
}
