"use client";

import { Metro } from "@/lib/types";
import { useMemo } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

// Channel definitions — maps MetroSignals keys to channels
// The MetroSignals field names are repurposed from v1:
//   jobPostingsVelocity = new biz apps
//   unemploymentClaims = unemployment rate + claims
//   googleTrendsAnxiety = search anxiety
//   housingInventory = housing inventory
//   restaurantActivity = days on market
//   buildingPermits = price drops
//   wageToRentRatio = AI job ratio
const CHANNELS = [
  {
    key: "labor",
    name: "Labor Demand",
    signals: ["unemploymentClaims", "jobPostingsVelocity"] as const,
    directions: [-1, 1], // lower unemployment = better, more biz apps = better
    color: "#6366f1",
    description: "Unemployment claims, new business formation",
  },
  {
    key: "cost",
    name: "Cost of Living",
    signals: ["googleTrendsAnxiety", "housingInventory"] as const,
    directions: [-1, -1], // lower anxiety = better, lower inventory = tighter market
    color: "#f59e0b",
    description: "Search anxiety, housing supply pressure",
  },
  {
    key: "confidence",
    name: "Consumer Confidence",
    signals: ["googleTrendsAnxiety", "wageToRentRatio"] as const,
    directions: [-1, 1], // lower anxiety = better, more AI adoption = adapting
    color: "#22c55e",
    description: "Sentiment, AI job market transition",
  },
  {
    key: "financial",
    name: "Financial Stress",
    signals: ["buildingPermits"] as const, // price drops as proxy
    directions: [-1], // fewer price drops = less stress
    color: "#ef4444",
    description: "Housing price drops, credit conditions",
  },
  {
    key: "housing",
    name: "Housing Market",
    signals: ["housingInventory", "restaurantActivity", "buildingPermits"] as const,
    directions: [-1, -1, -1], // lower inventory, fewer DOM, fewer drops = stronger
    color: "#8b5cf6",
    description: "Inventory, days on market, price reductions",
  },
];

type SignalKey = keyof Metro["currentSignals"];

export function ChannelBreakdown({ metros }: { metros: Metro[] }) {
  const { channelScores, channelHistory } = useMemo(() => {
    if (metros.length === 0) return { channelScores: [], channelHistory: [] };

    // Compute current channel scores
    const scores = CHANNELS.map((ch) => {
      let totalZ = 0;
      let count = 0;
      for (const metro of metros) {
        ch.signals.forEach((sigKey, idx) => {
          const val = metro.currentSignals[sigKey as SignalKey];
          if (val !== undefined && val !== 0) {
            totalZ += val * ch.directions[idx];
            count++;
          }
        });
      }
      const avgZ = count > 0 ? totalZ / count : 0;
      const score = Math.max(0, Math.min(100, Math.round((avgZ + 3) / 6 * 100)));
      return { ...ch, score, avgZ };
    });

    // Compute channel history over time (from metro histories)
    // Build weekly national average per channel
    const weekCount = Math.min(...metros.filter(m => m.history.length > 0).map(m => m.history.length));
    const history: Array<{ week: string; composite: number }> = [];

    for (let w = Math.max(0, weekCount - 52); w < weekCount; w++) {
      let week = "";
      let composite = 50;

      const firstMetro = metros.find(m => m.history[w]);
      if (firstMetro?.history[w]) {
        const d = new Date(firstMetro.history[w].week + "T00:00:00");
        week = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

        let total = 0;
        let mCount = 0;
        for (const metro of metros) {
          if (metro.history[w]) {
            total += metro.history[w].compositeScore;
            mCount++;
          }
        }
        if (mCount > 0) composite = Math.round(total / mCount);
      }

      history.push({ week, composite });
    }

    return { channelScores: scores, channelHistory: history };
  }, [metros]);

  if (channelScores.length === 0) return null;

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h2 className="text-lg font-semibold text-foreground mb-1">What&apos;s Driving the Score</h2>
      <p className="text-sm text-muted-foreground mb-6">Five channels of economic welfare — each scored independently.</p>

      {/* Channel bars */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-6 mb-10">
        {channelScores.map((ch) => (
          <div key={ch.key}>
            <div className="text-xs font-medium text-muted-foreground mb-2">{ch.name}</div>
            <div className="relative h-1.5 bg-zinc-100 rounded-full mb-2">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                style={{ width: `${ch.score}%`, backgroundColor: ch.color, opacity: 0.7 }}
              />
              <div className="absolute inset-y-0 left-1/2 w-px bg-zinc-300" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-mono font-bold tabular-nums" style={{ color: ch.color }}>
                {ch.score}
              </span>
              <span className="text-[10px] text-muted-foreground">/100</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{ch.description}</div>
          </div>
        ))}
      </div>

      {/* National composite trend */}
      {channelHistory.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">National Composite — Last 52 Weeks</h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={channelHistory} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="channelGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis dataKey="week" tick={{ fill: "#a1a1aa", fontSize: 9 }} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(channelHistory.length / 6) - 1)} />
                <YAxis domain={[30, 70]} tick={{ fill: "#a1a1aa", fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-white border border-zinc-200 rounded-lg px-3 py-1.5 shadow-lg text-xs">
                      <span className="text-zinc-500">{label}: </span>
                      <span className="font-mono font-semibold">{payload[0].value}</span>
                    </div>
                  );
                }} />
                <Area type="monotone" dataKey="composite" stroke="#6366f1" strokeWidth={2} fill="url(#channelGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
}
