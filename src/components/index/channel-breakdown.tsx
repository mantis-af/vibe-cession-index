"use client";

import { ChannelTimeseries } from "@/lib/types";
import {
  ResponsiveContainer, LineChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function ChannelBreakdown({ channels }: { channels: ChannelTimeseries[] }) {
  if (channels.length === 0) return null;

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h2 className="text-lg font-semibold text-foreground mb-1">Index Channels</h2>
      <p className="text-sm text-muted-foreground mb-8">
        Each channel pairs our weekly alt-data signal (solid) with the official monthly benchmark (dashed) it&apos;s trying to predict.
        Dotted line = ML projection of where the official reading is heading.
      </p>

      <div className="space-y-8">
        {channels.map((ch) => (
          <ChannelChart key={ch.key} channel={ch} />
        ))}
      </div>
    </section>
  );
}

function ChannelChart({ channel: ch }: { channel: ChannelTimeseries }) {
  if (ch.data.length === 0) return null;

  // Format dates for display
  const chartData = ch.data.map((d) => ({
    ...d,
    label: formatDate(d.date),
  }));

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{ch.name}</h3>
            <span className={`flex items-center gap-0.5 text-xs ${
              ch.predictionDirection === "improving" ? "text-emerald-600" :
              ch.predictionDirection === "worsening" ? "text-red-600" : "text-zinc-500"
            }`}>
              {ch.predictionDirection === "improving" ? <TrendingUp className="h-3 w-3" /> :
               ch.predictionDirection === "worsening" ? <TrendingDown className="h-3 w-3" /> :
               <Minus className="h-3 w-3" />}
              {ch.predictionDirection}
            </span>
            {ch.rSquared > 0.02 && (
              <span className="text-[10px] font-mono text-muted-foreground">R²={ch.rSquared.toFixed(2)}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-[2px] rounded" style={{ backgroundColor: ch.color }} />
            {ch.altLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-[2px] rounded bg-zinc-400" style={{ borderTop: "2px dashed #94a3b8", background: "transparent" }} />
            {ch.officialLabel}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-44 sm:h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id={`pred-${ch.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ch.color} stopOpacity={0.08} />
                <stop offset="100%" stopColor={ch.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
            <XAxis
              dataKey="label"
              tick={{ fill: "#a1a1aa", fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              interval={Math.max(0, Math.floor(chartData.length / 8) - 1)}
            />
            <YAxis
              domain={[-3, 3]}
              tick={{ fill: "#a1a1aa", fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              ticks={[-2, -1, 0, 1, 2]}
            />
            <ReferenceLine y={0} stroke="#e4e4e7" />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload;
              return (
                <div className="bg-white border border-zinc-200 rounded-lg px-3 py-2 shadow-lg text-xs">
                  <div className="text-zinc-500 mb-1">{label}</div>
                  {d?.alt !== null && d?.alt !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ch.color }} />
                      <span>Alt: <span className="font-mono font-semibold">{d.alt.toFixed(2)}σ</span></span>
                    </div>
                  )}
                  {d?.official !== null && d?.official !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-zinc-400" />
                      <span>Official: <span className="font-mono font-semibold">{d.official.toFixed(2)}σ</span></span>
                    </div>
                  )}
                  {d?.prediction !== null && d?.prediction !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full opacity-60" style={{ backgroundColor: ch.color }} />
                      <span>Predicted: <span className="font-mono font-semibold">{d.prediction.toFixed(2)}σ</span></span>
                    </div>
                  )}
                </div>
              );
            }} />

            {/* Confidence interval band */}
            <Area
              type="monotone"
              dataKey="predUpper"
              stroke="none"
              fill={ch.color}
              fillOpacity={0.06}
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="predLower"
              stroke="none"
              fill="#fafafa"
              fillOpacity={1}
              connectNulls={false}
            />

            {/* Alt signal — solid colored line */}
            <Line
              type="monotone"
              dataKey="alt"
              stroke={ch.color}
              strokeWidth={2}
              dot={false}
              connectNulls
            />

            {/* Official benchmark — dashed gray with dots */}
            <Line
              type="monotone"
              dataKey="official"
              stroke="#94a3b8"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              dot={{ r: 2, fill: "#94a3b8" }}
              connectNulls
            />

            {/* ML prediction — dotted colored line */}
            <Line
              type="monotone"
              dataKey="prediction"
              stroke={ch.color}
              strokeWidth={1.5}
              strokeDasharray="3 3"
              strokeOpacity={0.6}
              dot={false}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Insight */}
      <p className="text-xs text-muted-foreground mt-2">{ch.insight}</p>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}
