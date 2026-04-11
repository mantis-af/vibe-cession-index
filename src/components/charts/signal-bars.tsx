"use client";

import { MetroSignals, SIGNAL_LABELS, SIGNAL_DESCRIPTIONS, SIGNAL_WEIGHTS } from "@/lib/types";

interface Props {
  signals: MetroSignals;
}

export function SignalBars({ signals }: Props) {
  const entries = (Object.keys(signals) as Array<keyof MetroSignals>).map((key) => ({
    key,
    label: SIGNAL_LABELS[key],
    description: SIGNAL_DESCRIPTIONS[key],
    weight: SIGNAL_WEIGHTS[key],
    zScore: signals[key],
    // Convert z-score to 0-100 for bar width
    normalizedValue: Math.round(((signals[key] + 3) / 6) * 100),
  }));

  // Sort by weight (highest first)
  entries.sort((a, b) => b.weight - a.weight);

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.key}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground">{entry.label}</span>
              <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {Math.round(entry.weight * 100)}%
              </span>
            </div>
            <span className={`text-sm font-mono font-semibold ${zScoreColor(entry.zScore)}`}>
              {entry.zScore > 0 ? "+" : ""}{entry.zScore.toFixed(2)}
            </span>
          </div>
          <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(2, entry.normalizedValue)}%`,
                backgroundColor: barColor(entry.normalizedValue),
              }}
            />
            {/* Center line at 50% (z=0) */}
            <div className="absolute inset-y-0 left-1/2 w-px bg-zinc-600" />
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{entry.description}</div>
        </div>
      ))}
    </div>
  );
}

function zScoreColor(z: number): string {
  if (z >= 1) return "text-green-400";
  if (z >= 0.3) return "text-green-400/70";
  if (z >= -0.3) return "text-zinc-400";
  if (z >= -1) return "text-red-400/70";
  return "text-red-400";
}

function barColor(normalized: number): string {
  if (normalized >= 65) return "#22c55e";
  if (normalized >= 55) return "#84cc16";
  if (normalized >= 45) return "#eab308";
  if (normalized >= 35) return "#f97316";
  return "#ef4444";
}
