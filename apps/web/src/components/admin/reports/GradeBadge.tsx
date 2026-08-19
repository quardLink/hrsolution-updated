const COLOR_MAP: Record<string, string> = {
  "A+": "bg-emerald-500/15 text-emerald-400",
  "A": "bg-emerald-500/15 text-emerald-400",
  "B+": "bg-indigo-500/15 text-indigo-300",
  "B": "bg-indigo-500/15 text-indigo-300",
  "C": "bg-amber-500/15 text-amber-400",
  "D": "bg-orange-500/15 text-orange-400",
  "F": "bg-red-500/15 text-red-400",
};

export default function GradeBadge({ grade }: { grade: string }) {
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${COLOR_MAP[grade] ?? "bg-muted text-muted-foreground"}`}>
      {grade}
    </span>
  );
}
