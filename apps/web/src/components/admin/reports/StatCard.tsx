interface Props {
  label: string;
  value: number;
  color: "blue" | "emerald" | "indigo" | "violet" | "amber";
}

const COLOR_MAP: Record<Props["color"], string> = {
  blue: "from-blue-600 to-blue-700",
  emerald: "from-emerald-600 to-emerald-700",
  indigo: "from-indigo-600 to-indigo-700",
  violet: "from-violet-600 to-violet-700",
  amber: "from-amber-600 to-amber-700",
};

export default function StatCard({ label, value, color }: Props) {
  return (
    <div className={`bg-gradient-to-br ${COLOR_MAP[color]} rounded-xl shadow-lg text-white p-4`}>
      <div className="text-xs uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  );
}
