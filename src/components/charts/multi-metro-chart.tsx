"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { Metro } from "@/lib/types";

const PALETTE = [
  "#6366f1", // violet
  "#38bdf8", // sky
  "#fb923c", // orange
  "#4ade80", // green
  "#f472b6", // pink
  "#fbbf24", // amber
];

interface Props {
  metros: Metro[];
  dataKey?: "compositeScore" | "officialIndex" | "vibesGap";
  height?: number;
}

export function MultiMetroChart({ metros, dataKey = "compositeScore", height = 340 }: Props) {
  if (metros.length === 0) return null;

  // Build unified dataset keyed by week
  const weekMap = new Map<string, Record<string, number>>();
  for (const metro of metros) {
    for (const snap of metro.history) {
      if (!weekMap.has(snap.week)) {
        weekMap.set(snap.week, {});
      }
      const row = weekMap.get(snap.week)!;
      row[metro.id] = snap[dataKey];
    }
  }

  const data = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, values]) => ({
      week: formatWeek(week),
      rawWeek: week,
      ...values,
    }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
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
          domain={dataKey === "vibesGap" ? ["auto", "auto"] : [0, 100]}
          tick={{ fill: "#a1a1aa", fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: "#e4e4e7" }}
        />
        {dataKey === "vibesGap" && (
          <ReferenceLine y={0} stroke="#52525b" strokeDasharray="4 4" />
        )}
        {dataKey === "compositeScore" && (
          <ReferenceLine y={50} stroke="#3f3f46" strokeDasharray="4 4" />
        )}
        <Tooltip content={<CompareTooltip metros={metros} />} />
        {metros.map((metro, i) => (
          <Line
            key={metro.id}
            type="monotone"
            dataKey={metro.id}
            stroke={PALETTE[i % PALETTE.length]}
            strokeWidth={2}
            dot={false}
            name={metro.name}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function CompareTooltip({ active, payload, label, metros }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
  metros: Metro[];
}) {
  if (!active || !payload?.length) return null;

  const sorted = [...payload].sort((a, b) => b.value - a.value);

  return (
    <div className="bg-white border border-zinc-200 rounded-lg px-3 py-2 shadow-xl min-w-[160px]">
      <div className="text-xs text-zinc-500 mb-1.5">{label}</div>
      {sorted.map((p) => {
        const metro = metros.find((m) => m.id === p.dataKey);
        return (
          <div key={p.dataKey} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-zinc-600">{metro?.name || p.name}</span>
            </span>
            <span className="font-mono font-semibold text-zinc-900">{p.value}</span>
          </div>
        );
      })}
    </div>
  );
}

export { PALETTE as METRO_CHART_PALETTE };

function formatWeek(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
