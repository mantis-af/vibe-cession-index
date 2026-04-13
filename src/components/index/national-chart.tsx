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
}

export function NationalChart({ history }: Props) {
  const data = history.map((h) => ({
    week: formatWeek(h.week),
    behavioral: h.compositeScore,
    official: h.officialIndex,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">National Trend</h2>
          <p className="text-sm text-muted-foreground">Behavioral index vs official benchmark — {data.length} weeks</p>
        </div>
        <div className="flex items-center gap-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-[2px] rounded bg-indigo-500" />
            Behavioral
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-[2px] rounded bg-zinc-300" />
            Official
          </span>
        </div>
      </div>
      <div className="h-64 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="behavioralGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.composite} stopOpacity={0.12} />
                <stop offset="95%" stopColor={CHART_COLORS.composite} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
            <XAxis
              dataKey="week"
              tick={{ fill: "#a1a1aa", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval={Math.max(0, Math.floor(data.length / 8) - 1)}
            />
            <YAxis
              domain={[20, 80]}
              tick={{ fill: "#a1a1aa", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <ReferenceLine y={50} stroke="#e4e4e7" strokeDasharray="4 4" />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-white border border-zinc-200 rounded-lg px-3 py-2 shadow-lg text-xs">
                    <div className="text-zinc-500 mb-1">{label}</div>
                    {payload.map((p) => (
                      <div key={p.name} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="text-zinc-600">{p.name}:</span>
                        <span className="font-mono font-semibold">{p.value}</span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="behavioral"
              name="Behavioral"
              stroke={CHART_COLORS.composite}
              strokeWidth={2}
              fill="url(#behavioralGrad)"
            />
            <Area
              type="monotone"
              dataKey="official"
              name="Official"
              stroke="#d4d4d8"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              fill="none"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function formatWeek(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}
