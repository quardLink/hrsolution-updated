import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLocale } from "@/contexts/LocaleContext";
import type { EmployeeRanking } from "../../../hooks/useAttendanceAnalytics";

interface Props {
  rankings: EmployeeRanking[];
}

const MAX_ROWS = 8;
const ROW_HEIGHT = 34;

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: { name: string; score: number } }[] }) {
  if (!active || !payload?.length) return null;
  const { name, score } = payload[0].payload;
  return (
    <div className="bg-popover border border-popover-border rounded-lg px-3 py-2 shadow-lg text-sm">
      <div className="font-medium">{name}</div>
      <div className="text-muted-foreground text-xs mt-0.5">{score.toFixed(1)} / 100</div>
    </div>
  );
}

// A quick visual comparison of who's ranked where, complementing the
// detailed table below rather than duplicating it — same overallScore
// values, just as bars instead of a number in a row.
export default function RankingsChart({ rankings }: Props) {
  const { t } = useLocale();
  const data = rankings.slice(0, MAX_ROWS).map((r) => ({ name: r.employeeName, score: Math.round(r.overallScore * 10) / 10 }));

  if (data.length === 0) return null;

  return (
    <div className="bg-card border border-card-border rounded-xl p-5">
      <div className="font-semibold text-sm mb-1">{t("reports.scoreChartTitle")}</div>
      <p className="text-xs text-muted-foreground mb-4">{t("reports.scoreChartSubtitle")}</p>
      <ResponsiveContainer width="100%" height={data.length * ROW_HEIGHT + 16}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }}>
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
          <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={16} isAnimationActive={false}>
            {data.map((_, i) => (
              <Cell key={i} fill="hsl(var(--primary))" fillOpacity={i === 0 ? 1 : 0.55 + 0.45 * ((data.length - i) / data.length)} />
            ))}
            <LabelList
              dataKey="score"
              position="right"
              formatter={(v: number) => v.toFixed(1)}
              style={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
