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
    value: Math.round(((signals[key] + 3) / 6) * 100),
    raw: signals[key],
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="#e4e4e7" />
        <PolarAngleAxis dataKey="signal" tick={{ fill: "#71717a", fontSize: 10 }} />
        <Radar
          dataKey="value"
          stroke="#6366f1"
          fill="#6366f1"
          fillOpacity={0.12}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
