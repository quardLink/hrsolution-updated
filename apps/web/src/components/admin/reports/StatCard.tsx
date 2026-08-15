interface Props {
  label: string;
  value: number;
  color: "blue" | "emerald" | "indigo" | "violet" | "amber";
}

const COLOR_MAP: Record<Props["color"], string> = {
  blue: "from-blue-500 to-blue-600",
  emerald: "from-emerald-500 to-emerald-600",
  indigo: "from-indigo-500 to-indigo-600",
  violet: "from-violet-500 to-violet-600",
  amber: "from-amber-500 to-amber-600",
};

export default function StatCard({ label, value, color }: Props) {
  return (
    <div className={`bg-gradient-to-br ${COLOR_MAP[color]} rounded-xl shadow-md text-white p-4`}>
      <div className="text-xs uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  );
}
