const COLOR_MAP: Record<string, string> = {
  "A+": "bg-emerald-100 text-emerald-700",
  "A": "bg-emerald-100 text-emerald-700",
  "B+": "bg-blue-100 text-blue-700",
  "B": "bg-blue-100 text-blue-700",
  "C": "bg-amber-100 text-amber-700",
  "D": "bg-orange-100 text-orange-700",
  "F": "bg-red-100 text-red-700",
};

export default function GradeBadge({ grade }: { grade: string }) {
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${COLOR_MAP[grade] ?? "bg-gray-100 text-gray-700"}`}>
      {grade}
    </span>
  );
}
