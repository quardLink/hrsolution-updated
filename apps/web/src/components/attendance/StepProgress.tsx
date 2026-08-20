import type { Step } from "../../hooks/useAttendanceWizard";

const STEPS: { id: Step; label: string }[] = [
  { id: "action", label: "Select" },
  { id: "employee", label: "Identify" },
  { id: "face", label: "Face" },
  { id: "pin", label: "PIN" },
  { id: "result", label: "Done" },
];

export default function StepProgress({ step }: { step: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="flex items-center gap-2">
      {STEPS.map((s, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={s.id} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  done || active ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              />
              <span
                className={`text-xs font-medium transition-colors hidden sm:inline ${
                  active ? "text-foreground" : "text-muted-foreground/60"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && <div className="w-4 sm:w-6 h-px bg-border" />}
          </div>
        );
      })}
    </div>
  );
}
