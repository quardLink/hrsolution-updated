export default function ScoreBar({ value, suffix = "" }: { value: number; suffix?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const color = v >= 90 ? "bg-emerald-500" : v >= 75 ? "bg-indigo-500" : v >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-[60px]">
        <div className={`h-full ${color} transition-all`} style={{ width: `${v}%` }} />
      </div>
      <span className="text-xs font-medium text-foreground/80 w-10 text-right">{v.toFixed(0)}{suffix}</span>
    </div>
  );
}
