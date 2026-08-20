import { Card } from "@/components/ui/card";

interface Props {
  label: string;
  value: number;
  color: "blue" | "emerald" | "indigo" | "violet" | "amber";
}

const TONE_MAP: Record<Props["color"], string> = {
  blue: "bg-blue-500/10 text-blue-500",
  emerald: "bg-emerald-500/10 text-emerald-500",
  indigo: "bg-primary/10 text-primary",
  violet: "bg-violet-500/10 text-violet-500",
  amber: "bg-amber-500/10 text-amber-500",
};

export default function StatCard({ label, value, color }: Props) {
  return (
    <Card className="p-4 gap-1">
      <div className={`inline-flex w-fit text-xs font-medium px-1.5 py-0.5 rounded ${TONE_MAP[color]}`}>{label}</div>
      <div className="text-2xl lg:text-3xl font-semibold tabular-nums mt-1">{value}</div>
    </Card>
  );
}
