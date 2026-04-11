"use client";

import Link from "next/link";
import { Metro } from "@/lib/types";
import { scoreColor, changeColor, trendColor, gapColor } from "@/lib/colors";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion";
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight, ChevronRight } from "lucide-react";

function TrendIcon({ trend }: { trend: Metro["trend"] }) {
  switch (trend) {
    case "improving": return <TrendingUp className="h-3 w-3" />;
    case "declining": return <TrendingDown className="h-3 w-3" />;
    case "stable": return <Minus className="h-3 w-3" />;
  }
}

function MiniSparkline({ history }: { history: Metro["history"] }) {
  const scores = history.slice(-8).map((h) => h.compositeScore);
  const min = Math.min(...scores) - 3;
  const max = Math.max(...scores) + 3;
  const range = max - min || 1;
  const w = 72;
  const h = 24;

  const points = scores.map((s, i) => {
    const x = (i / (scores.length - 1)) * w;
    const y = h - ((s - min) / range) * h;
    return `${x},${y}`;
  });

  const lastScore = scores[scores.length - 1];
  const color = scoreColor(lastScore);

  // Create area fill path
  const areaPath = `M0,${h} ${points.map((p) => `L${p}`).join(" ")} L${w},${h} Z`;
  const linePath = points.join(" ");

  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-${lastScore}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-${lastScore})`} />
      <polyline
        points={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MetroGrid({ metros }: { metros: Metro[] }) {
  const sorted = [...metros].sort((a, b) => b.currentScore - a.currentScore);

  return (
    <section className="relative px-6 lg:px-8 py-24 max-w-7xl mx-auto">
      <FadeIn>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">
          Metro Rankings
        </h2>
        <p className="text-muted-foreground max-w-xl mb-12">
          Click any metro to explore its detailed breakdown — signals, trends, and the vibes gap story.
        </p>
      </FadeIn>

      <StaggerContainer className="space-y-2" staggerDelay={0.04}>
        {/* Table header */}
        <div className="grid grid-cols-[3rem_1fr_5rem_6rem_5rem_5rem_5rem_2rem] gap-4 items-center px-5 py-2 text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
          <span>Rank</span>
          <span>Metro</span>
          <span className="text-right">Score</span>
          <span className="text-right">Trend</span>
          <span className="text-right">WoW</span>
          <span className="text-right">Gap</span>
          <span className="text-right">8W</span>
          <span />
        </div>

        {sorted.map((metro, idx) => (
          <StaggerItem key={metro.id}>
            <Link
              href={`/metro/${metro.id}`}
              className="group grid grid-cols-[3rem_1fr_5rem_6rem_5rem_5rem_5rem_2rem] gap-4 items-center glass rounded-xl px-5 py-4 hover:bg-white/[0.04] hover:border-violet-500/20 transition-all duration-300"
            >
              {/* Rank */}
              <span className="text-sm font-mono text-muted-foreground">
                {String(idx + 1).padStart(2, "0")}
              </span>

              {/* Metro name */}
              <div>
                <span className="text-sm font-semibold text-foreground group-hover:text-violet-300 transition-colors">
                  {metro.name}
                </span>
                <span className="text-xs text-muted-foreground ml-2">{metro.state}</span>
              </div>

              {/* Score */}
              <div className="text-right">
                <span
                  className="text-lg font-mono font-bold tabular-nums"
                  style={{ color: scoreColor(metro.currentScore) }}
                >
                  {metro.currentScore}
                </span>
              </div>

              {/* Trend */}
              <div className={`flex items-center justify-end gap-1 text-xs ${trendColor(metro.trend)}`}>
                <TrendIcon trend={metro.trend} />
                <span className="capitalize">{metro.trend}</span>
              </div>

              {/* WoW Change */}
              <div className={`flex items-center justify-end gap-0.5 text-sm font-mono tabular-nums ${changeColor(metro.weekOverWeekChange)}`}>
                {metro.weekOverWeekChange > 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : metro.weekOverWeekChange < 0 ? (
                  <ArrowDownRight className="h-3 w-3" />
                ) : (
                  <Minus className="h-3 w-3" />
                )}
                {metro.weekOverWeekChange > 0 ? "+" : ""}{metro.weekOverWeekChange}
              </div>

              {/* Gap */}
              <div className={`text-right text-sm font-mono tabular-nums ${gapColor(metro.vibesGap)}`}>
                {metro.vibesGap > 0 ? "+" : ""}{metro.vibesGap}
              </div>

              {/* Sparkline */}
              <div className="flex justify-end">
                <MiniSparkline history={metro.history} />
              </div>

              {/* Arrow */}
              <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </section>
  );
}
