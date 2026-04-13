"use client";

import { DashboardDomain, DashboardMetric } from "@/lib/dashboard-data";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function EconomicDashboard({ domains }: { domains: DashboardDomain[] }) {
  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h2 className="text-lg font-semibold text-foreground mb-1">Economic Vital Signs</h2>
      <p className="text-sm text-muted-foreground mb-8">
        Real numbers, updated as they come in. Sparklines show the recent trajectory.
      </p>

      <div className="space-y-10">
        {domains.map((domain) => (
          <div key={domain.key}>
            <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground mb-4">{domain.name}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-5">
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

  // Format the value nicely
  const formatted = formatValue(m.value, m.unit);

  // Mini sparkline SVG
  const spark = m.sparkline;
  const sparkMin = Math.min(...spark);
  const sparkMax = Math.max(...spark);
  const sparkRange = sparkMax - sparkMin || 1;
  const sparkW = 60;
  const sparkH = 20;
  const sparkPoints = spark.map((v, i) => {
    const x = (i / (spark.length - 1)) * sparkW;
    const y = sparkH - ((v - sparkMin) / sparkRange) * sparkH;
    return `${x},${y}`;
  }).join(" ");
  const sparkColor = m.direction === "up" ? "#22c55e" : m.direction === "down" ? "#ef4444" : "#a1a1aa";

  return (
    <div className="group">
      {/* Name + freshness */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{m.name}</span>
        <span className="text-[9px] text-zinc-300 font-mono">{formatDate(m.date)}</span>
      </div>

      {/* Value + sparkline row */}
      <div className="flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-mono font-bold tabular-nums text-foreground">
            {formatted}
          </span>
          {m.unit && !["$", ""].includes(m.unit) && (
            <span className="text-[10px] text-muted-foreground">{m.unit}</span>
          )}
        </div>

        {/* Sparkline */}
        <svg width={sparkW} height={sparkH} className="flex-shrink-0">
          <polyline
            points={sparkPoints}
            fill="none"
            stroke={sparkColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Change indicator */}
      {m.change !== null && (
        <div className={`flex items-center gap-1 mt-0.5 text-[10px] font-mono ${dirColor}`}>
          <DirIcon className="h-2.5 w-2.5" />
          <span>{m.change > 0 ? "+" : ""}{m.change}</span>
          {m.changePct !== null && <span>({m.changePct > 0 ? "+" : ""}{m.changePct}%)</span>}
        </div>
      )}
    </div>
  );
}

function formatValue(value: number, unit: string): string {
  if (unit === "$") return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (value >= 10000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (value >= 100) return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return value.toFixed(2);
}

function formatDate(date: string): string {
  if (date.length === 7) return date; // YYYY-MM
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
