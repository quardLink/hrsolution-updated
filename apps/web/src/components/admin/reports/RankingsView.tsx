import type { EmployeeRanking } from "../../../hooks/useAttendanceAnalytics";
import PodiumCard from "./PodiumCard";
import ScoreBar from "./ScoreBar";
import GradeBadge from "./GradeBadge";

interface Props {
  rankings: EmployeeRanking[];
  totalDaysInPeriod: number;
}

export default function RankingsView({ rankings, totalDaysInPeriod }: Props) {
  return (
    <div className="space-y-6">
      {/* Top 3 podium */}
      {rankings.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PodiumCard rank={2} ranking={rankings[1]} />
          <PodiumCard rank={1} ranking={rankings[0]} />
          <PodiumCard rank={3} ranking={rankings[2]} />
        </div>
      )}

      {/* Full ranking table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Performance Rankings</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Score = Punctuality 40% + Attendance 30% + Reliability 30%
            </p>
          </div>
          <div className="text-xs text-gray-500">
            Period: {totalDaysInPeriod} day(s)
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase text-gray-500 bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-3 text-center">Rank</th>
                <th className="px-3 py-3 text-left">Employee</th>
                <th className="px-3 py-3 text-left">Role</th>
                <th className="px-3 py-3 text-center">Days</th>
                <th className="px-3 py-3 text-center">Attendance</th>
                <th className="px-3 py-3 text-center">Punctuality</th>
                <th className="px-3 py-3 text-center">Reliability</th>
                <th className="px-3 py-3 text-center">Avg Late</th>
                <th className="px-3 py-3 text-center">Avg Hrs/Day</th>
                <th className="px-3 py-3 text-center">Score</th>
                <th className="px-3 py-3 text-center">Grade</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((r, i) => (
                <tr key={r.employeeId} className={`border-b border-gray-100 hover:bg-gray-50 ${i < 3 ? "bg-amber-50/30" : ""}`}>
                  <td className="px-3 py-3 text-center font-bold">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-gray-900">{r.employeeName}</div>
                    <div className="text-xs text-gray-500">{r.employeeId}</div>
                  </td>
                  <td className="px-3 py-3 text-gray-700 capitalize text-xs">{r.role.replace("_", " ")}</td>
                  <td className="px-3 py-3 text-center text-gray-700">
                    {r.daysPresent}<span className="text-gray-400">/{r.totalDaysInPeriod}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <ScoreBar value={Math.min(100, r.attendanceRate)} suffix="%" />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <ScoreBar value={r.punctualityScore} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <ScoreBar value={r.reliabilityScore} suffix="%" />
                  </td>
                  <td className="px-3 py-3 text-center text-gray-700">
                    {r.avgMinutesLate > 0 ? `${r.avgMinutesLate.toFixed(0)}m` : <span className="text-emerald-600 font-medium">0m</span>}
                  </td>
                  <td className="px-3 py-3 text-center text-gray-700">
                    {r.avgHoursPerDay > 0 ? r.avgHoursPerDay.toFixed(1) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center font-bold text-gray-900">
                    {r.overallScore.toFixed(1)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <GradeBadge grade={r.grade} />
                  </td>
                </tr>
              ))}
              {rankings.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-gray-400">
                    No data for the selected period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
