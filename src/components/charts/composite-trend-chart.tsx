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
            <stop offset="5%" stopColor={CHART_COLORS.composite} stopOpacity={0.15} />
            <stop offset="95%" stopColor={CHART_COLORS.composite} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradOfficial" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.official} stopOpacity={0.08} />
            <stop offset="95%" stopColor={CHART_COLORS.official} stopOpacity={0} />
          </linearGradient>
        </defs>
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
          domain={[0, 100]}
          tick={{ fill: "#a1a1aa", fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: "#e4e4e7" }}
        />
        <ReferenceLine y={50} stroke="#d4d4d8" strokeDasharray="4 4" label={{ value: "50", fill: "#a1a1aa", fontSize: 10 }} />
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
    <div className="bg-white border border-zinc-200 rounded-lg px-3 py-2 shadow-lg">
      <div className="text-xs text-zinc-500 mb-1.5">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-zinc-600">{p.name}:</span>
          <span className="font-mono font-semibold text-zinc-900">{p.value}</span>
        </div>
      ))}
      {payload.length >= 2 && (
        <div className="mt-1.5 pt-1.5 border-t border-zinc-100 text-xs">
          <span className="text-zinc-500">Sentiment Gap: </span>
          <span className={`font-mono font-semibold ${payload[0].value - payload[1].value >= 0 ? "text-emerald-600" : "text-red-600"}`}>
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
