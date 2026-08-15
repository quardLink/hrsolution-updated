import type { Action } from "../../hooks/useAttendanceWizard";

export default function ActionStep({ onSelect }: { onSelect: (action: Action) => void }) {
  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">What would you like to do?</h2>
        <p className="text-blue-300 mt-1 text-sm">Check in when you arrive, check out when you leave</p>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <button
          onClick={() => onSelect("checkin")}
          className="group relative overflow-hidden bg-white rounded-2xl p-6 shadow-xl border border-white/10 hover:scale-105 transition-all duration-200 cursor-pointer text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center text-3xl">
              ☀️
            </div>
            <div>
              <div className="font-bold text-gray-900 text-lg">Check In</div>
              <div className="text-gray-500 text-sm mt-0.5">Mark your arrival in the morning</div>
            </div>
          </div>
        </button>
        <button
          onClick={() => onSelect("checkout")}
          className="group relative overflow-hidden bg-white rounded-2xl p-6 shadow-xl border border-white/10 hover:scale-105 transition-all duration-200 cursor-pointer text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center text-3xl">
              🌙
            </div>
            <div>
              <div className="font-bold text-gray-900 text-lg">Check Out</div>
              <div className="text-gray-500 text-sm mt-0.5">Mark your departure when leaving</div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
