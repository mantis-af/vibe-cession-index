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
    normalizedValue: Math.round(((signals[key] + 3) / 6) * 100),
  }));

  entries.sort((a, b) => b.weight - a.weight);

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.key}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground">{entry.label}</span>
              <span className="text-[10px] font-mono text-muted-foreground bg-zinc-100 px-1.5 py-0.5 rounded">
                {Math.round(entry.weight * 100)}%
              </span>
            </div>
            <span className={`text-sm font-mono font-semibold ${zScoreColor(entry.zScore)}`}>
              {entry.zScore > 0 ? "+" : ""}{entry.zScore.toFixed(2)}
            </span>
          </div>
          <div className="relative h-2 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(2, entry.normalizedValue)}%`,
                backgroundColor: barColor(entry.normalizedValue),
              }}
            />
            <div className="absolute inset-y-0 left-1/2 w-px bg-zinc-300" />
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{entry.description}</div>
        </div>
      ))}
    </div>
  );
}

function zScoreColor(z: number): string {
  if (z >= 1) return "text-emerald-600";
  if (z >= 0.3) return "text-emerald-600/70";
  if (z >= -0.3) return "text-zinc-500";
  if (z >= -1) return "text-red-600/70";
  return "text-red-600";
}

function barColor(normalized: number): string {
  if (normalized >= 65) return "#16a34a";
  if (normalized >= 55) return "#65a30d";
  if (normalized >= 45) return "#ca8a04";
  if (normalized >= 35) return "#ea580c";
  return "#dc2626";
}
