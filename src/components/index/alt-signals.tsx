"use client";

import { AltSignalSeries } from "@/lib/dashboard-data";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function AltSignalPanel({ signals }: { signals: AltSignalSeries[] }) {
  if (signals.length === 0) return null;

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h2 className="text-lg font-semibold text-foreground mb-1">Real-Time Alt-Data Signals</h2>
      <p className="text-sm text-muted-foreground mb-8">
        Weekly behavioral signals averaged across 50 metros. These move before official data does.
        Zero line = historical average. Above = elevated, below = subdued.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {signals.map((sig) => (
          <SignalCard key={sig.key} signal={sig} />
        ))}
      </div>
    </section>
  );
}

function SignalCard({ signal: s }: { signal: AltSignalSeries }) {
  const DirIcon = s.direction === "up" ? TrendingUp : s.direction === "down" ? TrendingDown : Minus;
  const dirColor = s.direction === "up" ? "text-emerald-600" : s.direction === "down" ? "text-red-500" : "text-zinc-400";

  const chartData = s.data.map(d => ({
    date: formatWeek(d.date),
    value: d.value,
  }));

  // Determine if latest value is above or below zero for coloring
  const isAbove = s.latest >= 0;
  const fillColor = isAbove ? s.color : s.color;

  return (
    <div className="rounded-xl border border-zinc-100 bg-white p-4 hover:border-zinc-200 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-medium text-foreground truncate">{s.name}</h4>
          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{s.description}</p>
        </div>
      </div>

      {/* Value + change */}
      <div className="flex items-baseline gap-2 mt-2 mb-1">
        <span className="text-xl font-mono font-bold tabular-nums" style={{ color: s.color }}>
          {s.latest > 0 ? "+" : ""}{s.latest.toFixed(2)}
        </span>
        <span className="text-[10px] text-muted-foreground">z</span>
        {s.change4w !== null && (
          <span className={`flex items-center gap-0.5 text-xs font-mono ${dirColor}`}>
            <DirIcon className="h-3 w-3" />
            {s.change4w > 0 ? "+" : ""}{s.change4w.toFixed(2)}
            <span className="text-[10px] opacity-60">4w</span>
          </span>
        )}
      </div>

      {/* Chart */}
      <div className="h-28 mt-2 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id={`altgrad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={fillColor} stopOpacity={0.15} />
                <stop offset="100%" stopColor={fillColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <YAxis hide domain={["auto", "auto"]} />
            <ReferenceLine y={0} stroke="#d4d4d8" strokeDasharray="3 3" strokeWidth={1} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const v = payload[0]?.value as number;
                return (
                  <div className="bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 shadow-lg text-xs">
                    <div className="text-zinc-400 text-[10px] mb-0.5">{label}</div>
                    <span className="font-mono font-semibold" style={{ color: s.color }}>
                      {v > 0 ? "+" : ""}{v.toFixed(3)}
                    </span>
                    <span className="text-muted-foreground ml-1">z-score</span>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={s.color}
              strokeWidth={2}
              fill={`url(#altgrad-${s.key})`}
              dot={false}
              activeDot={{ r: 3, fill: s.color, stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function formatWeek(date: string): string {
  const [year, month, day] = date.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(month) - 1]} ${parseInt(day)}`;
}
