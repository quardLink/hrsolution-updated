const COLOR_MAP: Record<string, string> = {
  "A+": "bg-emerald-500/10 text-emerald-600",
  "A": "bg-emerald-500/10 text-emerald-600",
  "B+": "bg-primary/10 text-primary",
  "B": "bg-primary/10 text-primary",
  "C": "bg-amber-500/10 text-amber-600",
  "D": "bg-orange-500/10 text-orange-600",
  "F": "bg-red-500/10 text-red-600",
};

export default function GradeBadge({ grade }: { grade: string }) {
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${COLOR_MAP[grade] ?? "bg-muted text-muted-foreground"}`}>
      {grade}
    </span>
  );
}
