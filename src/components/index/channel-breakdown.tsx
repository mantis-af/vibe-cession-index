"use client";

import { Metro } from "@/lib/types";
import { useMemo } from "react";

// Map signal keys to channels
const CHANNELS: Record<string, { name: string; signals: string[]; color: string; description: string }> = {
  labor: {
    name: "Labor Demand",
    signals: ["unemploymentClaims", "jobPostingsVelocity"],
    color: "#6366f1",
    description: "Business formation, unemployment claims, hiring activity",
  },
  cost: {
    name: "Cost of Living",
    signals: ["googleTrendsAnxiety", "housingInventory"],
    color: "#f59e0b",
    description: "Search anxiety, housing pressure, affordability stress",
  },
  financial: {
    name: "Financial Stress",
    signals: ["buildingPermits"], // repurposed slot
    color: "#ef4444",
    description: "Credit conditions, mortgage rates, high-yield spreads",
  },
  confidence: {
    name: "Consumer Confidence",
    signals: ["googleTrendsAnxiety", "wageToRentRatio"],
    color: "#22c55e",
    description: "Search sentiment, savings behavior, spending patterns",
  },
  housing: {
    name: "Housing Market",
    signals: ["housingInventory", "restaurantActivity"],
    color: "#8b5cf6",
    description: "Inventory, days on market, price drops, home values",
  },
};

export function ChannelBreakdown({ metros }: { metros: Metro[] }) {
  // Compute national channel scores from the latest signal z-scores
  const channelScores = useMemo(() => {
    if (metros.length === 0) return [];

    return Object.entries(CHANNELS).map(([key, ch]) => {
      // Average the relevant signals across all metros
      let totalZ = 0;
      let count = 0;
      for (const metro of metros) {
        const sigs = metro.currentSignals;
        for (const sigKey of ch.signals) {
          const val = sigs[sigKey as keyof typeof sigs];
          if (val !== undefined && val !== 0) {
            totalZ += val;
            count++;
          }
        }
      }
      const avgZ = count > 0 ? totalZ / count : 0;
      // Convert z-score to 0-100 scale
      const score = Math.max(0, Math.min(100, Math.round((avgZ + 3) / 6 * 100)));

      return {
        key,
        name: ch.name,
        score,
        color: ch.color,
        description: ch.description,
        direction: avgZ > 0.1 ? "positive" : avgZ < -0.1 ? "negative" : "neutral",
      };
    });
  }, [metros]);

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h2 className="text-lg font-semibold text-foreground mb-1">Index Channels</h2>
      <p className="text-sm text-muted-foreground mb-6">What&apos;s driving the national score — five causal channels of economic welfare.</p>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        {channelScores.map((ch) => (
          <div key={ch.key} className="py-4 px-1">
            {/* Channel name */}
            <div className="text-xs font-medium text-muted-foreground mb-2">{ch.name}</div>

            {/* Score bar */}
            <div className="relative h-1.5 bg-zinc-100 rounded-full mb-2">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                style={{ width: `${ch.score}%`, backgroundColor: ch.color, opacity: 0.7 }}
              />
              <div className="absolute inset-y-0 left-1/2 w-px bg-zinc-300" />
            </div>

            {/* Score + direction */}
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-mono font-bold tabular-nums" style={{ color: ch.color }}>
                {ch.score}
              </span>
              <span className="text-[10px] text-muted-foreground">/100</span>
            </div>

            {/* Description */}
            <div className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
              {ch.description}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
