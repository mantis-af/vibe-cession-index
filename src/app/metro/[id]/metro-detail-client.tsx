"use client";

import Link from "next/link";
import { Metro } from "@/lib/types";
import { scoreColor, changeColor, trendColor } from "@/lib/colors";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion";
import { CompositeTrendChart } from "@/components/charts/composite-trend-chart";
import { SignalsRadarChart } from "@/components/charts/signals-radar-chart";
import { VibesGapChart } from "@/components/charts/vibes-gap-chart";
import { SignalBars } from "@/components/charts/signal-bars";
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight, ChevronRight } from "lucide-react";

interface NeighborMetro {
  id: string;
  name: string;
  state: string;
  score: number;
  rank: number;
}

export function MetroDetailClient({ metro, neighbors }: { metro: Metro; neighbors: NeighborMetro[] }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
      {/* Quick stats row */}
      <FadeIn>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-50 rounded-2xl overflow-hidden">
          <QuickStat
            label="Score"
            value={metro.currentScore.toString()}
            color={scoreColor(metro.currentScore)}
          />
          <QuickStat
            label="Week over Week"
            value={`${metro.weekOverWeekChange > 0 ? "+" : ""}${metro.weekOverWeekChange}`}
            color={metro.weekOverWeekChange >= 0 ? "#4ade80" : "#f87171"}
            icon={metro.weekOverWeekChange > 0 ? "up" : metro.weekOverWeekChange < 0 ? "down" : "flat"}
          />
          <QuickStat
            label="4-Week Trend"
            value={metro.trend}
            color={metro.trend === "improving" ? "#4ade80" : metro.trend === "declining" ? "#f87171" : "#a1a1aa"}
            icon={metro.trend === "improving" ? "up" : metro.trend === "declining" ? "down" : "flat"}
          />
          <QuickStat
            label="Sentiment Gap"
            value={`${metro.vibesGap > 0 ? "+" : ""}${metro.vibesGap}`}
            color={metro.vibesGap >= 0 ? "#4ade80" : "#f87171"}
          />
        </div>
      </FadeIn>

      {/* Charts row 1: Composite Trend + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <FadeIn delay={0.1} className="lg:col-span-3">
          <div className="surface rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Index Trend</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Behavioral vs. official — rolling 12 months</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-6 h-[2px] rounded bg-indigo-500" />
                  Behavioral
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-6 h-[2px] rounded opacity-50" style={{ borderTop: "2px dashed #60a5fa", background: "transparent" }} />
                  Official
                </span>
              </div>
            </div>
            <CompositeTrendChart history={metro.history} showOfficial />
          </div>
        </FadeIn>

        <FadeIn delay={0.2} className="lg:col-span-2">
          <div className="surface rounded-2xl p-6 h-full">
            <h3 className="text-sm font-semibold text-foreground mb-1">Signal Radar</h3>
            <p className="text-xs text-muted-foreground mb-4">Component signal strength distribution</p>
            <SignalsRadarChart signals={metro.currentSignals} />
          </div>
        </FadeIn>
      </div>

      {/* Charts row 2: Sentiment Gap + Signal Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <FadeIn delay={0.15} className="lg:col-span-3">
          <div className="surface rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-foreground mb-1">Sentiment Gap History</h3>
            <p className="text-xs text-muted-foreground mb-6">
              Positive = people feel better than official stats suggest
            </p>
            <VibesGapChart history={metro.history} />
          </div>
        </FadeIn>

        <FadeIn delay={0.25} className="lg:col-span-2">
          <div className="surface rounded-2xl p-6 h-full">
            <h3 className="text-sm font-semibold text-foreground mb-1">Component Signals</h3>
            <p className="text-xs text-muted-foreground mb-4">Z-scores weighted by importance</p>
            <SignalBars signals={metro.currentSignals} />
          </div>
        </FadeIn>
      </div>

      {/* Nearby rankings */}
      {neighbors.length > 0 && (
        <FadeIn delay={0.2}>
          <div className="surface rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-foreground mb-1">Nearby in Rankings</h3>
            <p className="text-xs text-muted-foreground mb-4">Metros ranked close to {metro.name}</p>
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3" staggerDelay={0.06}>
              {neighbors.map((n) => (
                <StaggerItem key={n.id}>
                  <Link
                    href={`/metro/${n.id}`}
                    className="group flex items-center justify-between bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 hover:border-indigo-300 rounded-xl px-4 py-3 transition-all duration-300"
                  >
                    <div>
                      <span className="text-xs font-mono text-muted-foreground mr-2">#{String(n.rank).padStart(2, "0")}</span>
                      <span className="text-sm font-medium text-foreground group-hover:text-indigo-600 transition-colors">
                        {n.name}, {n.state}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-mono font-bold tabular-nums" style={{ color: scoreColor(n.score) }}>
                        {n.score}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-indigo-500 transition-colors" />
                    </div>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </FadeIn>
      )}
    </div>
  );
}

function QuickStat({ label, value, color, icon }: {
  label: string;
  value: string;
  color: string;
  icon?: "up" | "down" | "flat";
}) {
  return (
    <div className="bg-background/50 px-6 py-5 text-center">
      <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-2">
        {label}
      </div>
      <div className="flex items-center justify-center gap-1.5">
        {icon === "up" && <ArrowUpRight className="h-4 w-4" style={{ color }} />}
        {icon === "down" && <ArrowDownRight className="h-4 w-4" style={{ color }} />}
        {icon === "flat" && <Minus className="h-4 w-4" style={{ color }} />}
        <span className="text-2xl font-mono font-bold capitalize tabular-nums" style={{ color }}>
          {value}
        </span>
      </div>
    </div>
  );
}
