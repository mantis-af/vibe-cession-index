"use client";

import { NowcastChannel } from "@/lib/types";
import {
  ResponsiveContainer, ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function ChannelBreakdown({ channels }: { channels: NowcastChannel[] }) {
  if (channels.length === 0) return null;

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h2 className="text-lg font-semibold text-foreground mb-1">Nowcast Channels</h2>
      <p className="text-sm text-muted-foreground mb-8">
        Each channel uses weekly alt-data to estimate the current official reading before it&apos;s released.
        Dots = official data. Line = our estimate.
      </p>

      <div className="space-y-10">
        {channels.map((ch) => (
          <NowcastChart key={ch.key} channel={ch} />
        ))}
      </div>
    </section>
  );
}

function NowcastChart({ channel: ch }: { channel: NowcastChannel }) {
  if (ch.data.length === 0) return null;

  const chartData = ch.data.map((d) => ({
    date: formatMonth(d.date),
    official: d.official,
    nowcast: d.nowcast,
    isCurrent: d.isCurrentNowcast,
    // Scatter only gets points where official exists
    officialDot: d.official,
    // Highlight the current nowcast
    currentDot: d.isCurrentNowcast ? d.nowcast : null,
  }));

  return (
    <div>
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{ch.name}</h3>
            <span className={`flex items-center gap-0.5 text-xs ${
              ch.direction === "up" ? "text-emerald-600" :
              ch.direction === "down" ? "text-red-600" : "text-zinc-500"
            }`}>
              {ch.direction === "up" ? <TrendingUp className="h-3 w-3" /> :
               ch.direction === "down" ? <TrendingDown className="h-3 w-3" /> :
               <Minus className="h-3 w-3" />}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {ch.altSignal} → {ch.officialMetric}
          </div>
        </div>

        {/* Current nowcast highlight */}
        <div className="flex items-center gap-4">
          {ch.currentNowcast !== null && (
            <div className="text-right">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Current Nowcast</div>
              <div className="text-xl font-mono font-bold tabular-nums" style={{ color: ch.color }}>
                {ch.currentNowcast}{ch.unit === "%" ? "%" : ""}
              </div>
            </div>
          )}
          {ch.lastOfficial !== null && (
            <div className="text-right">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Last Official</div>
              <div className="text-xl font-mono font-bold tabular-nums text-zinc-400">
                {ch.lastOfficial}{ch.unit === "%" ? "%" : ""}
              </div>
            </div>
          )}
          <div className="text-right">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">R²</div>
            <div className="text-sm font-mono text-muted-foreground">{ch.oosR2.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-40 sm:h-48">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#a1a1aa", fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              interval={Math.max(0, Math.floor(chartData.length / 8) - 1)}
            />
            <YAxis
              tick={{ fill: "#a1a1aa", fontSize: 9 }}
              tickLine={false}
              axisLine={false}
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
                      <span>{d.isCurrent ? "Nowcast" : "Estimate"}: <span className="font-mono font-semibold">{d.nowcast}{ch.unit === "%" ? "%" : ""}</span></span>
                    </div>
                  )}
                </div>
              );
            }} />

            {/* Nowcast line — fills gaps between official dots */}
            <Line
              type="monotone"
              dataKey="nowcast"
              stroke={ch.color}
              strokeWidth={2}
              strokeOpacity={0.6}
              dot={false}
              connectNulls
            />

            {/* Official data dots — large, solid */}
            <Scatter
              dataKey="officialDot"
              fill="#18181b"
              r={4}
            />

            {/* Current nowcast highlight dot */}
            <Scatter
              dataKey="currentDot"
              fill={ch.color}
              r={6}
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
