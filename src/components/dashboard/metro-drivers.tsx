"use client";

import { Metro } from "@/lib/types";
import { FadeIn } from "@/components/motion";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

const SIGNAL_NAMES: Record<string, string> = {
  google_trends_anxiety: "Search Anxiety",
  unemployment_rate: "Unemployment",
  initial_claims: "Jobless Claims",
  housing_inventory: "Housing Supply",
  housing_dom: "Days on Market",
  housing_price_drops: "Price Drops",
};

export function MetroDrivers({ metro }: { metro: Metro }) {
  const { sentimentDrivers: drivers } = metro;
  if (!drivers.drivers.length) return null;

  const movers = drivers.drivers.filter((d) => Math.abs(d.scoreImpact) > 0.1);
  const sorted = [...movers].sort((a, b) => a.scoreImpact - b.scoreImpact); // worst first

  return (
    <FadeIn delay={0.3}>
      <div className="surface rounded-2xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-foreground">What&apos;s Driving {metro.name}</h3>
          <span className={`text-sm font-mono font-bold ${drivers.periodChange >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {drivers.periodChange > 0 ? "+" : ""}{drivers.periodChange} pts
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          Last 4 weeks vs. prior 4 weeks — which signals moved the score
        </p>

        <div className="space-y-2.5">
          {sorted.map((d) => {
            const name = SIGNAL_NAMES[d.signal] || d.signal;
            const impactColor = d.scoreImpact > 0 ? "text-emerald-600" : d.scoreImpact < 0 ? "text-red-600" : "text-zinc-500";
            const barWidth = Math.min(100, Math.abs(d.scoreImpact) * 12);
            const barColor = d.scoreImpact > 0 ? "#16a34a" : d.scoreImpact < 0 ? "#dc2626" : "#a1a1aa";

            return (
              <div key={d.signal} className="flex items-center gap-3">
                {/* Icon */}
                <div className="w-5 flex-shrink-0">
                  {d.direction === "up" ? (
                    <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                  ) : d.direction === "down" ? (
                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                  ) : (
                    <Minus className="h-4 w-4 text-zinc-400" />
                  )}
                </div>

                {/* Name */}
                <span className="text-sm text-foreground w-28 flex-shrink-0 truncate">{name}</span>

                {/* Bar */}
                <div className="flex-1 relative h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 rounded-full"
                    style={{
                      width: `${Math.max(1, barWidth)}%`,
                      backgroundColor: barColor,
                      left: d.scoreImpact >= 0 ? "50%" : `${50 - barWidth}%`,
                      opacity: 0.65,
                    }}
                  />
                  <div className="absolute inset-y-0 left-1/2 w-px bg-zinc-300" />
                </div>

                {/* Impact */}
                <span className={`text-xs font-mono font-semibold tabular-nums w-14 text-right flex-shrink-0 ${impactColor}`}>
                  {d.scoreImpact > 0 ? "+" : ""}{d.scoreImpact}
                </span>
              </div>
            );
          })}
        </div>

        {/* Period context */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-zinc-100 text-xs text-muted-foreground">
          <span>Prior 4wk: <span className="font-mono text-foreground">{drivers.priorAvg}</span></span>
          <span>→</span>
          <span>Recent 4wk: <span className="font-mono text-foreground">{drivers.recentAvg}</span></span>
        </div>
      </div>
    </FadeIn>
  );
}
