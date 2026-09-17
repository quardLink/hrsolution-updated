import { PieChart, Pie, Cell } from "recharts";
import { useLocale } from "@/contexts/LocaleContext";

interface Props {
  onTime: number;
  late: number;
  absent: number;
  total: number;
}

const SIZE = 172;
const THICKNESS = 24;

// A donut breakdown of today's attendance — on-time/late/absent are
// mutually exclusive subsets of `total`, so the ring always adds up to a
// whole (unlike "present", which overlaps on-time+late).
export default function AttendanceRing({ onTime, late, absent, total }: Props) {
  const { t } = useLocale();
  const present = onTime + late;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  const segments = [
    { key: "onTime", label: t("today.onTime"), value: onTime, color: "hsl(var(--block-blue))" },
    { key: "late", label: t("today.late"), value: late, color: "hsl(var(--block-yellow))" },
    { key: "absent", label: t("today.absent"), value: absent, color: "hsl(var(--block-pink))" },
  ];
  const data = segments.filter((s) => s.value > 0);
  const isEmpty = data.length === 0;

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <PieChart width={SIZE} height={SIZE}>
          <Pie
            data={isEmpty ? [{ key: "empty", value: 1 }] : data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={SIZE / 2 - THICKNESS}
            outerRadius={SIZE / 2}
            startAngle={90}
            endAngle={-270}
            stroke="none"
            paddingAngle={isEmpty || data.length < 2 ? 0 : 3}
            isAnimationActive={false}
          >
            {isEmpty ? (
              <Cell fill="hsl(var(--muted))" />
            ) : (
              data.map((seg) => <Cell key={seg.key} fill={seg.color} />)
            )}
          </Pie>
        </PieChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold tabular-nums text-foreground">{rate}%</span>
          <span className="text-[11px] font-medium text-muted-foreground mt-0.5 text-center px-4">
            {t("today.attendanceRate")}
          </span>
        </div>
      </div>

      <div className="w-full space-y-2.5">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
            <span className="font-semibold tabular-nums">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
