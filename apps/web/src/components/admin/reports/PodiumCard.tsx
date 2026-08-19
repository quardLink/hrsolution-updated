import type { EmployeeRanking } from "../../../hooks/useAttendanceAnalytics";

const CONFIG: Record<number, { medal: string; bg: string; height: string; label: string }> = {
  1: { medal: "🥇", bg: "from-amber-400 to-yellow-500", height: "md:py-8", label: "1st Place" },
  2: { medal: "🥈", bg: "from-gray-300 to-gray-400", height: "md:py-6", label: "2nd Place" },
  3: { medal: "🥉", bg: "from-amber-700 to-amber-800", height: "md:py-6", label: "3rd Place" },
};

export default function PodiumCard({ rank, ranking }: { rank: number; ranking: EmployeeRanking }) {
  const config = CONFIG[rank]!;
  return (
    <div className={`bg-gradient-to-br ${config.bg} rounded-2xl shadow-xl text-white p-6 ${config.height} text-center`}>
      <div className="text-5xl mb-2">{config.medal}</div>
      <div className="text-xs uppercase tracking-wider opacity-90">{config.label}</div>
      <div className="text-2xl font-bold mt-1">{ranking.employeeName}</div>
      <div className="text-sm opacity-90 capitalize mb-3">{ranking.role.replace("_", " ")}</div>
      <div className="bg-white/20 rounded-lg px-3 py-2 mt-2">
        <div className="text-3xl font-bold">{ranking.overallScore.toFixed(1)}</div>
        <div className="text-xs uppercase opacity-80">Overall Score · Grade {ranking.grade}</div>
      </div>
    </div>
  );
}
