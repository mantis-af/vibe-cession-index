"use client";

import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";
import { MetroSignals, SIGNAL_LABELS } from "@/lib/types";

interface Props {
  signals: MetroSignals;
}

export function SignalsRadarChart({ signals }: Props) {
  const data = (Object.keys(signals) as Array<keyof MetroSignals>).map((key) => ({
    signal: SIGNAL_LABELS[key],
    // Convert z-score (-3..3) to 0-100 for display
    value: Math.round(((signals[key] + 3) / 6) * 100),
    raw: signals[key],
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="#27272a" />
        <PolarAngleAxis
          dataKey="signal"
          tick={{ fill: "#a1a1aa", fontSize: 10 }}
        />
        <Radar
          dataKey="value"
          stroke="#a78bfa"
          fill="#a78bfa"
          fillOpacity={0.2}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
