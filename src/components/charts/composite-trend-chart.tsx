"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { MetroWeeklySnapshot } from "@/lib/types";
import { CHART_COLORS } from "@/lib/colors";

interface Props {
  history: MetroWeeklySnapshot[];
  showOfficial?: boolean;
}

export function CompositeTrendChart({ history, showOfficial = true }: Props) {
  const data = history.map((h) => ({
    week: formatWeek(h.week),
    rawWeek: h.week,
    composite: h.compositeScore,
    official: h.officialIndex,
    gap: h.vibesGap,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="gradComposite" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.composite} stopOpacity={0.3} />
            <stop offset="95%" stopColor={CHART_COLORS.composite} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradOfficial" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.official} stopOpacity={0.15} />
            <stop offset="95%" stopColor={CHART_COLORS.official} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
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
          domain={[0, 100]}
          tick={{ fill: "#71717a", fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: "#27272a" }}
        />
        <ReferenceLine y={50} stroke="#3f3f46" strokeDasharray="4 4" label={{ value: "50", fill: "#52525b", fontSize: 10 }} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="composite"
          stroke={CHART_COLORS.composite}
          strokeWidth={2.5}
          fill="url(#gradComposite)"
          name="Behavioral Index"
        />
        {showOfficial && (
          <Area
            type="monotone"
            dataKey="official"
            stroke={CHART_COLORS.official}
            strokeWidth={1.5}
            strokeDasharray="5 3"
            fill="url(#gradOfficial)"
            name="Official Index"
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl">
      <div className="text-xs text-zinc-400 mb-1.5">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-zinc-300">{p.name}:</span>
          <span className="font-mono font-semibold text-zinc-100">{p.value}</span>
        </div>
      ))}
      {payload.length >= 2 && (
        <div className="mt-1.5 pt-1.5 border-t border-zinc-700 text-xs">
          <span className="text-zinc-400">Sentiment Gap: </span>
          <span className={`font-mono font-semibold ${payload[0].value - payload[1].value >= 0 ? "text-green-400" : "text-red-400"}`}>
            {payload[0].value - payload[1].value > 0 ? "+" : ""}
            {payload[0].value - payload[1].value}
          </span>
        </div>
      )}
    </div>
  );
}

function formatWeek(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
