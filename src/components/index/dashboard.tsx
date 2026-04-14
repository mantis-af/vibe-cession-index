"use client";

import { DashboardDomain, DashboardMetric } from "@/lib/dashboard-data";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function EconomicDashboard({ domains }: { domains: DashboardDomain[] }) {
  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h2 className="text-lg font-semibold text-foreground mb-1">Economic Vital Signs</h2>
      <p className="text-sm text-muted-foreground mb-8">
        Real numbers from official sources. Charts show the last 12 readings.
      </p>

      <div className="space-y-10">
        {domains.map((domain) => (
          <div key={domain.key}>
            <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground mb-4">{domain.name}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {domain.metrics.map((metric) => (
                <MetricCard key={metric.id} metric={metric} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MetricCard({ metric: m }: { metric: DashboardMetric }) {
  const dirColor = m.direction === "up" ? "text-emerald-600" : m.direction === "down" ? "text-red-500" : "text-zinc-400";
  const DirIcon = m.direction === "up" ? TrendingUp : m.direction === "down" ? TrendingDown : Minus;
  const areaColor = m.direction === "up" ? "#22c55e" : m.direction === "down" ? "#ef4444" : "#a1a1aa";

  const formatted = formatValue(m.value, m.unit);

  // Build chart data from sparkline
  const chartData = m.sparkline.map((v, i) => ({
    idx: i,
    value: v,
    label: m.sparkDates?.[i] ?? `${i}`,
  }));

  return (
    <div className="rounded-xl border border-zinc-100 bg-white p-4 hover:border-zinc-200 transition-colors">
      {/* Header: name + date */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">{m.name}</span>
        <span className="text-[10px] text-zinc-300 font-mono">{formatDate(m.date)}</span>
      </div>

      {/* Value row */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl font-mono font-bold tabular-nums text-foreground">
          {formatted}
        </span>
        {m.unit && !["$", ""].includes(m.unit) && (
          <span className="text-xs text-muted-foreground">{m.unit}</span>
        )}
        {m.change !== null && (
          <span className={`flex items-center gap-0.5 text-xs font-mono ${dirColor}`}>
            <DirIcon className="h-3 w-3" />
            {m.change > 0 ? "+" : ""}{m.change}
            {m.changePct !== null && <span className="text-[10px] opacity-70">({m.changePct > 0 ? "+" : ""}{m.changePct}%)</span>}
          </span>
        )}
      </div>

      {/* Expanded chart */}
      <div className="h-24 mt-2 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${m.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={areaColor} stopOpacity={0.2} />
                <stop offset="100%" stopColor={areaColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" hide />
            <YAxis hide domain={["auto", "auto"]} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const v = payload[0]?.value as number;
                return (
                  <div className="bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 shadow-lg text-xs">
                    <span className="font-mono font-semibold">{formatValue(v, m.unit)}</span>
                    <span className="text-muted-foreground ml-1">{m.unit}</span>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={areaColor}
              strokeWidth={2}
              fill={`url(#grad-${m.id})`}
              dot={false}
              activeDot={{ r: 3, fill: areaColor, stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function formatValue(value: number, unit: string): string {
  if (unit === "$" || unit === "$/gal") return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (value >= 10000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (value >= 100) return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return value.toFixed(2);
}

function formatDate(date: string): string {
  if (date.length === 7) return date;
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
