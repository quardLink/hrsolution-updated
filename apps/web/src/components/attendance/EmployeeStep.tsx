import type { EmployeeOption } from "../../hooks/useAttendanceWizard";

interface Props {
  sessionLabel: string;
  employees: EmployeeOption[] | undefined;
  onBack: () => void;
  onSelect: (id: string) => void;
}

export default function EmployeeStep({ sessionLabel, employees, onBack, onSelect }: Props) {
  return (
    <div className="w-full max-w-sm space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          ←
        </button>
        <div>
          <h2 className="text-xl font-bold text-white">Select Your Name</h2>
          <p className="text-blue-300 text-sm">{sessionLabel}</p>
        </div>
      </div>
      <div className="space-y-2">
        {employees?.map((emp) => (
          <button
            key={emp.id}
            onClick={() => onSelect(emp.id)}
            className="w-full bg-white rounded-xl p-4 flex items-center gap-3 shadow-lg hover:scale-105 transition-all duration-150 cursor-pointer text-left border border-transparent hover:border-blue-200"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {emp.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <div className="font-semibold text-gray-900">{emp.name}</div>
              <div className="text-gray-400 text-xs">{emp.id}</div>
            </div>
          </button>
        ))}
        {!employees && (
          <div className="text-center text-blue-300 py-8">Loading employees...</div>
        )}
      </div>
    </div>
  );
}
