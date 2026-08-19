import type { Action } from "../../hooks/useAttendanceWizard";

export default function ActionStep({ onSelect }: { onSelect: (action: Action) => void }) {
  return (
    <div className="w-full max-w-3xl space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground">What would you like to do?</h2>
        <p className="text-muted-foreground mt-2">Check in when you arrive, check out when you leave</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <button
          onClick={() => onSelect("checkin")}
          className="group relative overflow-hidden bg-card rounded-2xl p-8 lg:p-10 shadow-xl border border-border hover:border-primary/50 hover:scale-[1.02] transition-all duration-200 cursor-pointer text-left"
        >
          <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-4xl lg:text-5xl mb-5">
            ☀️
          </div>
          <div className="font-bold text-foreground text-2xl">Check In</div>
          <div className="text-muted-foreground text-sm mt-1.5">Mark your arrival in the morning</div>
        </button>
        <button
          onClick={() => onSelect("checkout")}
          className="group relative overflow-hidden bg-card rounded-2xl p-8 lg:p-10 shadow-xl border border-border hover:border-primary/50 hover:scale-[1.02] transition-all duration-200 cursor-pointer text-left"
        >
          <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-primary/15 flex items-center justify-center text-4xl lg:text-5xl mb-5">
            🌙
          </div>
          <div className="font-bold text-foreground text-2xl">Check Out</div>
          <div className="text-muted-foreground text-sm mt-1.5">Mark your departure when leaving</div>
        </button>
      </div>
    </div>
  );
}
