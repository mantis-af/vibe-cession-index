"use client";

import { MetroWeeklySnapshot, MetroSignals } from "@/lib/types";
import { CompositeTrendChart } from "@/components/charts/composite-trend-chart";
import { SignalsRadarChart } from "@/components/charts/signals-radar-chart";
import { VibesGapChart } from "@/components/charts/vibes-gap-chart";
import { SignalBars } from "@/components/charts/signal-bars";

interface Props {
  history: MetroWeeklySnapshot[];
  signals: MetroSignals;
}

export function MetroDetailCharts({ history, signals }: Props) {
  return (
    <div className="space-y-6">
      {/* Row 1: Composite trend + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Composite Index Trend
          </h3>
          <div className="flex items-center gap-4 mb-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-violet-400 rounded" />
              Behavioral Index
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-blue-400 rounded border-dashed" style={{ borderTop: "1px dashed #60a5fa", background: "transparent" }} />
              Official Index
            </span>
          </div>
          <CompositeTrendChart history={history} showOfficial />
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Signal Distribution
          </h3>
          <SignalsRadarChart signals={signals} />
        </div>
      </div>

      {/* Row 2: Vibes Gap + Signal Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            Vibes Gap Over Time
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Behavioral Index minus Official Index. Positive = people feel better than data suggests.
          </p>
          <VibesGapChart history={history} />
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Component Signals
          </h3>
          <SignalBars signals={signals} />
        </div>
      </div>
    </div>
  );
}
