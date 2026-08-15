import type { Reminder } from "../../hooks/useCheckOutReminder";

export default function ReminderBanner({ reminder, onDismiss }: { reminder: Reminder; onDismiss: () => void }) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-4 shadow-2xl flex items-center justify-between gap-4"
      style={{ animation: "slideDown 0.4s ease-out, pulseGlow 1.5s ease-in-out infinite alternate" }}
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl animate-bounce">🔔</span>
        <div>
          <div className="font-bold text-lg">{reminder.label}</div>
          <div className="text-sm opacity-95">{reminder.message}</div>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium text-sm border border-white/30"
      >
        Dismiss
      </button>
      <style>{`
        @keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }
        @keyframes pulseGlow { from { box-shadow: 0 4px 20px rgba(251,146,60,0.5); } to { box-shadow: 0 4px 40px rgba(251,146,60,0.9); } }
      `}</style>
    </div>
  );
}
