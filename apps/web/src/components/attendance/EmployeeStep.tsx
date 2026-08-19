import type { EmployeeOption } from "../../hooks/useAttendanceWizard";

interface Props {
  sessionLabel: string;
  employees: EmployeeOption[] | undefined;
  onBack: () => void;
  onSelect: (id: string) => void;
}

export default function EmployeeStep({ sessionLabel, employees, onBack, onSelect }: Props) {
  return (
    <div className="w-full max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center text-foreground hover:border-primary/50 transition-colors flex-shrink-0"
        >
          ←
        </button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Select Your Name</h2>
          <p className="text-muted-foreground text-sm">{sessionLabel}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {employees?.map((emp) => (
          <button
            key={emp.id}
            onClick={() => onSelect(emp.id)}
            className="bg-card rounded-xl p-5 flex flex-col items-center gap-3 shadow-lg hover:scale-[1.03] transition-all duration-150 cursor-pointer text-center border border-border hover:border-primary/50"
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {emp.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-foreground truncate">{emp.name}</div>
              <div className="text-muted-foreground text-xs">{emp.id}</div>
            </div>
          </button>
        ))}
        {!employees && (
          <div className="col-span-full text-center text-muted-foreground py-12">Loading employees...</div>
        )}
      </div>
    </div>
  );
}
