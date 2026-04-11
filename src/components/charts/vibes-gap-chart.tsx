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
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis
          dataKey="week"
          tick={{ fill: "#71717a", fontSize: 10 }}
          tickLine={false}
          axisLine={{ stroke: "#27272a" }}
          interval={Math.max(0, Math.floor(data.length / 8) - 1)}
          angle={-30}
          dy={8}
        />
        <YAxis
          tick={{ fill: "#71717a", fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: "#27272a" }}
        />
        <ReferenceLine y={0} stroke="#52525b" />
        <Tooltip content={<GapTooltip />} />
        <Bar dataKey="gap" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.gap >= 0 ? "#22c55e" : "#ef4444"}
              fillOpacity={0.7}
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
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl">
      <div className="text-xs text-zinc-400 mb-1">{label}</div>
      <div className="text-sm">
        <span className="text-zinc-300">Sentiment Gap: </span>
        <span className={`font-mono font-semibold ${gap >= 0 ? "text-green-400" : "text-red-400"}`}>
          {gap > 0 ? "+" : ""}{gap}
        </span>
      </div>
      <div className="text-xs text-zinc-500 mt-0.5">
        {gap > 5 ? "People feel better than data shows" : gap < -5 ? "People feel worse than data shows" : "Behavioral and official metrics aligned"}
      </div>
    </div>
  );
}

function formatWeek(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
