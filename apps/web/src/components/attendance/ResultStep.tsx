interface Props {
  sessionLabel: string;
  employeeName: string;
  timestamp: string;
  onDone: () => void;
}

export default function ResultStep({ sessionLabel, employeeName, timestamp, onDone }: Props) {
  return (
    <div className="w-full max-w-sm space-y-5">
      <div className="bg-card border border-border rounded-2xl p-8 shadow-xl text-center space-y-5">
        <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center text-4xl mx-auto">
          ✅
        </div>

        <div>
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
            {sessionLabel}
          </p>
          <h3 className="text-2xl font-bold text-foreground mt-1">{employeeName}</h3>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
          <p className="text-emerald-400 text-sm font-semibold">Attendance Recorded Successfully</p>
        </div>

        <div className="text-muted-foreground text-xs">
          Logged at {timestamp}
        </div>

        <p className="text-muted-foreground text-xs">Returning to home in a few seconds…</p>
      </div>

      <button
        onClick={onDone}
        className="w-full bg-card border border-border rounded-2xl py-4 text-foreground font-semibold hover:border-primary/50 transition-colors"
      >
        Done — Return to Home
      </button>
    </div>
  );
}
