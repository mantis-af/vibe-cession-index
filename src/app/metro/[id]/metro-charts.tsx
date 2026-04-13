"use client";

import { Metro, MetroSignals } from "@/lib/types";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";
import { CHART_COLORS } from "@/lib/colors";

const SIGNAL_DISPLAY: Record<string, { label: string; description: string }> = {
  googleTrendsAnxiety: { label: "Search Anxiety", description: "Distress vs aspiration search ratio" },
  unemploymentClaims: { label: "Unemployment", description: "Claims and unemployment rate" },
  housingInventory: { label: "Housing Supply", description: "Active listings and inventory" },
  jobPostingsVelocity: { label: "Business Formation", description: "New business applications" },
  restaurantActivity: { label: "Days on Market", description: "How long homes sit unsold" },
  buildingPermits: { label: "Price Drops", description: "Percentage of listings with cuts" },
  wageToRentRatio: { label: "AI Search Ratio", description: "AI vs traditional job searches" },
  smallBizHealth: { label: "Small Biz Health", description: "Local business conditions" },
};

export function MetroCharts({ metro }: { metro: Metro }) {
  // Trend chart data
  const chartData = metro.history.map((h) => ({
    week: formatWeek(h.week),
    behavioral: h.compositeScore,
    official: h.officialIndex,
  }));

  // Active signals (non-zero)
  const activeSignals = Object.entries(metro.currentSignals)
    .filter(([, v]) => v !== 0)
    .map(([key, value]) => ({
      key,
      value,
      ...(SIGNAL_DISPLAY[key] || { label: key, description: "" }),
    }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  return (
    <div>
      {/* Trend chart */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Trend</h2>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
        <div className="h-56 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="metroGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.composite} stopOpacity={0.12} />
                  <stop offset="95%" stopColor={CHART_COLORS.composite} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis dataKey="week" tick={{ fill: "#a1a1aa", fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(chartData.length / 8) - 1)} />
              <YAxis domain={[20, 80]} tick={{ fill: "#a1a1aa", fontSize: 10 }} tickLine={false} axisLine={false} />
              <ReferenceLine y={50} stroke="#e4e4e7" strokeDasharray="4 4" />
              <Tooltip content={({ active, payload, label }) => {
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
              }} />
              <Area type="monotone" dataKey="behavioral" name="Behavioral" stroke={CHART_COLORS.composite} strokeWidth={2} fill="url(#metroGrad)" />
              <Area type="monotone" dataKey="official" name="Official" stroke="#d4d4d8" strokeWidth={1.5} strokeDasharray="4 3" fill="none" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Signal breakdown */}
      {activeSignals.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Signal Breakdown</h2>
          <p className="text-sm text-muted-foreground mb-4">Current z-scores — positive means above historical average.</p>
          <div className="space-y-3">
            {activeSignals.map((sig) => {
              const barWidth = Math.min(100, Math.abs(sig.value) / 3 * 50 + 2);
              const isPositive = sig.value > 0;
              return (
                <div key={sig.key}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="text-sm text-foreground">{sig.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">{sig.description}</span>
                    </div>
                    <span className={`text-sm font-mono font-semibold tabular-nums ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
                      {sig.value > 0 ? "+" : ""}{sig.value.toFixed(2)}
                    </span>
                  </div>
                  <div className="relative h-1.5 bg-zinc-100 rounded-full">
                    <div
                      className="absolute inset-y-0 rounded-full"
                      style={{
                        width: `${barWidth}%`,
                        left: isPositive ? "50%" : `${50 - barWidth}%`,
                        backgroundColor: isPositive ? "#22c55e" : "#ef4444",
                        opacity: 0.6,
                      }}
                    />
                    <div className="absolute inset-y-0 left-1/2 w-px bg-zinc-300" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function formatWeek(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}
