"use client";

import { NowcastChannel } from "@/lib/types";
import {
  ResponsiveContainer, ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function NowcastGrid({ channels }: { channels: NowcastChannel[] }) {
  if (channels.length === 0) return null;

  return (
    <div className="space-y-8">
      {channels.map((ch) => (
        <NowcastPanel key={ch.key} channel={ch} />
      ))}
    </div>
  );
}

function NowcastPanel({ channel: ch }: { channel: NowcastChannel }) {
  if (ch.data.length === 0) return null;

  const chartData = ch.data.map((d) => ({
    date: formatMonth(d.date),
    official: d.official,
    nowcast: d.nowcast,
    isCurrent: d.isCurrentNowcast,
    officialDot: d.official,
    currentDot: d.isCurrentNowcast ? d.nowcast : null,
  }));

  const dirColor = ch.direction === "up" ? "text-emerald-600"
    : ch.direction === "down" ? "text-red-600" : "text-zinc-500";
  const DirIcon = ch.direction === "up" ? TrendingUp
    : ch.direction === "down" ? TrendingDown : Minus;

  // R² quality indicator
  const r2Quality = ch.oosR2 >= 0.9 ? "Excellent" : ch.oosR2 >= 0.7 ? "Good" : ch.oosR2 >= 0.4 ? "Fair" : "Weak";
  const r2Color = ch.oosR2 >= 0.9 ? "text-emerald-600" : ch.oosR2 >= 0.7 ? "text-blue-600" : ch.oosR2 >= 0.4 ? "text-amber-600" : "text-red-500";

  return (
    <div className="rounded-xl border border-zinc-100 bg-white p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-foreground">{ch.name}</h3>
            <span className={`flex items-center gap-0.5 text-xs ${dirColor}`}>
              <DirIcon className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="text-xs text-muted-foreground mb-1">
            Predicting: <span className="text-foreground font-medium">{ch.officialMetric}</span>
          </div>
          <div className="text-[10px] text-zinc-400 font-mono">{ch.altSignal}</div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6">
          {ch.currentNowcast !== null && (
            <div className="text-right">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Nowcast</div>
              <div className="text-2xl font-mono font-bold tabular-nums" style={{ color: ch.color }}>
                {ch.currentNowcast}{ch.unit === "%" ? "%" : ""}
              </div>
            </div>
          )}
          {ch.lastOfficial !== null && (
            <div className="text-right">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Last Official</div>
              <div className="text-2xl font-mono font-bold tabular-nums text-zinc-400">
                {ch.lastOfficial}{ch.unit === "%" ? "%" : ""}
              </div>
            </div>
          )}
          <div className="text-right">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Model Fit</div>
            <div className={`text-sm font-mono ${r2Color}`}>
              R&sup2; = {ch.oosR2.toFixed(3)}
            </div>
            <div className={`text-[10px] font-mono ${r2Color}`}>{r2Quality}</div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-56 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#a1a1aa", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval={Math.max(0, Math.floor(chartData.length / 8) - 1)}
            />
            <YAxis
              tick={{ fill: "#a1a1aa", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={55}
              tickFormatter={(v) => formatYAxisValue(v, ch.unit)}
            />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload;
              return (
                <div className="bg-white border border-zinc-200 rounded-lg px-3 py-2 shadow-lg text-xs">
                  <div className="text-zinc-500 mb-1">{label}</div>
                  {d?.official !== null && d?.official !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-zinc-800" />
                      <span>Official: <span className="font-mono font-semibold">{d.official}{ch.unit === "%" ? "%" : ""}</span></span>
                    </div>
                  )}
                  {d?.nowcast !== null && d?.nowcast !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ch.color }} />
                      <span>{d.isCurrent ? "Nowcast" : "Model"}: <span className="font-mono font-semibold">{d.nowcast}{ch.unit === "%" ? "%" : ""}</span></span>
                    </div>
                  )}
                </div>
              );
            }} />

            {/* Model estimate line */}
            <Line
              type="monotone"
              dataKey="nowcast"
              stroke={ch.color}
              strokeWidth={2}
              strokeOpacity={0.7}
              dot={false}
              connectNulls
            />

            {/* Official data dots */}
            <Scatter
              dataKey="officialDot"
              fill="#18181b"
              r={4}
            />

            {/* Current nowcast highlight */}
            <Scatter
              dataKey="currentDot"
              fill={ch.color}
              r={7}
              stroke="#ffffff"
              strokeWidth={2}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function formatMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(month)]} ${year.slice(2)}`;
}

function formatYAxisValue(v: number, unit: string): string {
  if (unit === "%" || unit === "Index") return v.toFixed(1);
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
  return v.toFixed(0);
}
