"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from "recharts";
import { MetroWeeklySnapshot } from "@/lib/types";

interface Props {
  history: MetroWeeklySnapshot[];
}

export function VibesGapChart({ history }: Props) {
  const data = history.map((h) => ({
    week: formatWeek(h.week),
    gap: h.vibesGap,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
        <XAxis
          dataKey="week"
          tick={{ fill: "#a1a1aa", fontSize: 10 }}
          tickLine={false}
          axisLine={{ stroke: "#e4e4e7" }}
          interval={Math.max(0, Math.floor(data.length / 8) - 1)}
          angle={-30}
          dy={8}
        />
        <YAxis
          tick={{ fill: "#a1a1aa", fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: "#e4e4e7" }}
        />
        <ReferenceLine y={0} stroke="#a1a1aa" />
        <Tooltip content={<GapTooltip />} />
        <Bar dataKey="gap" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.gap >= 0 ? "#16a34a" : "#dc2626"}
              fillOpacity={0.6}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function GapTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const gap = payload[0].value;
  return (
    <div className="bg-white border border-zinc-200 rounded-lg px-3 py-2 shadow-lg">
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className="text-sm">
        <span className="text-zinc-600">Sentiment Gap: </span>
        <span className={`font-mono font-semibold ${gap >= 0 ? "text-emerald-600" : "text-red-600"}`}>
          {gap > 0 ? "+" : ""}{gap}
        </span>
      </div>
    </div>
  );
}

function formatWeek(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
