interface Props {
  sessionLabel: string;
  employeeName: string;
  timestamp: string;
  onDone: () => void;
}

export default function ResultStep({ sessionLabel, employeeName, timestamp, onDone }: Props) {
  return (
    <div className="w-full max-w-sm space-y-5">
      <div className="bg-white rounded-2xl p-8 shadow-xl text-center space-y-5">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-4xl mx-auto">
          ✅
        </div>

        <div>
          <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">
            {sessionLabel}
          </p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">{employeeName}</h3>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <p className="text-emerald-700 text-sm font-semibold">Attendance Recorded Successfully</p>
        </div>

        <div className="text-gray-400 text-xs">
          Logged at {timestamp}
        </div>

        <p className="text-gray-400 text-xs">Returning to home in a few seconds…</p>
      </div>

      <button
        onClick={onDone}
        className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 text-white font-semibold hover:bg-white/20 transition-colors"
      >
        Done — Return to Home
      </button>
    </div>
  );
}
