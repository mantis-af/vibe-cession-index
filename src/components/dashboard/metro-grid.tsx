"use client";

import { useState } from "react";
import Link from "next/link";
import { Metro } from "@/lib/types";
import { scoreColor, changeColor, trendColor, gapColor } from "@/lib/colors";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion";
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight, ChevronRight, Search } from "lucide-react";

function TrendIcon({ trend }: { trend: Metro["trend"] }) {
  switch (trend) {
    case "improving": return <TrendingUp className="h-3 w-3" />;
    case "declining": return <TrendingDown className="h-3 w-3" />;
    case "stable": return <Minus className="h-3 w-3" />;
  }
}

function MiniSparkline({ history }: { history: Metro["history"] }) {
  const scores = history.slice(-26).map((h) => h.compositeScore);
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
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "change" | "gap" | "name">("score");

  const filtered = metros.filter((m) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.state.toLowerCase().includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "score": return b.currentScore - a.currentScore;
      case "change": return b.weekOverWeekChange - a.weekOverWeekChange;
      case "gap": return b.vibesGap - a.vibesGap;
      case "name": return a.name.localeCompare(b.name);
    }
  });

  return (
    <section className="relative px-4 sm:px-6 lg:px-8 py-16 md:py-24 max-w-7xl mx-auto">
      <FadeIn>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-300/30 to-transparent" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 md:mb-10">
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl tracking-tight text-foreground mb-2">
              <span className="font-[family-name:var(--font-instrument)] italic">Metro Rankings</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl">
              {metros.length} metros ranked by behavioral index score.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search metros..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 pr-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg w-48 sm:w-56 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
              />
            </div>
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="py-2 px-3 text-xs bg-white border border-zinc-200 rounded-lg text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="score">By Score</option>
              <option value="change">By Change</option>
              <option value="gap">By Gap</option>
              <option value="name">By Name</option>
            </select>
          </div>
        </div>
      </FadeIn>

      {/* Desktop table — hidden on mobile */}
      <StaggerContainer className="hidden md:block space-y-2" staggerDelay={0.04}>
        <div className="grid grid-cols-[3rem_1fr_5rem_6rem_5rem_5rem_5rem_2rem] gap-4 items-center px-5 py-2 text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
          <span>Rank</span>
          <span>Metro</span>
          <span className="text-right">Score</span>
          <span className="text-right">Trend</span>
          <span className="text-right">WoW</span>
          <span className="text-right">Gap</span>
          <span className="text-right">6M</span>
          <span />
        </div>

        {sorted.map((metro, idx) => (
          <StaggerItem key={metro.id}>
            <Link
              href={`/metro/${metro.id}`}
              className="group grid grid-cols-[3rem_1fr_5rem_6rem_5rem_5rem_5rem_2rem] gap-4 items-center surface rounded-xl px-5 py-4 hover:bg-zinc-100 hover:border-indigo-300 transition-all duration-300"
            >
              <span className="text-sm font-mono text-muted-foreground">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <div>
                <span className="text-sm font-semibold text-foreground group-hover:text-indigo-600 transition-colors">
                  {metro.name}
                </span>
                <span className="text-xs text-muted-foreground ml-2">{metro.state}</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-mono font-bold tabular-nums" style={{ color: scoreColor(metro.currentScore) }}>
                  {metro.currentScore}
                </span>
              </div>
              <div className={`flex items-center justify-end gap-1 text-xs ${trendColor(metro.trend)}`}>
                <TrendIcon trend={metro.trend} />
                <span className="capitalize">{metro.trend}</span>
              </div>
              <div className={`flex items-center justify-end gap-0.5 text-sm font-mono tabular-nums ${changeColor(metro.weekOverWeekChange)}`}>
                {metro.weekOverWeekChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : metro.weekOverWeekChange < 0 ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {metro.weekOverWeekChange > 0 ? "+" : ""}{metro.weekOverWeekChange}
              </div>
              <div className={`text-right text-sm font-mono tabular-nums ${gapColor(metro.vibesGap)}`}>
                {metro.vibesGap > 0 ? "+" : ""}{metro.vibesGap}
              </div>
              <div className="flex justify-end">
                <MiniSparkline history={metro.history} />
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Mobile cards — hidden on desktop */}
      <StaggerContainer className="md:hidden space-y-3" staggerDelay={0.04}>
        {sorted.map((metro, idx) => (
          <StaggerItem key={metro.id}>
            <Link
              href={`/metro/${metro.id}`}
              className="group surface rounded-xl p-4 block hover:bg-zinc-100 hover:border-indigo-300 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono text-muted-foreground w-6">
                    #{idx + 1}
                  </span>
                  <div>
                    <span className="text-sm font-semibold text-foreground group-hover:text-indigo-600 transition-colors">
                      {metro.name}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1.5">{metro.state}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MiniSparkline history={metro.history} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-indigo-500 transition-colors" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Score</div>
                    <span className="text-xl font-mono font-bold tabular-nums" style={{ color: scoreColor(metro.currentScore) }}>
                      {metro.currentScore}
                    </span>
                  </div>
                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">WoW</div>
                    <span className={`text-sm font-mono tabular-nums flex items-center gap-0.5 ${changeColor(metro.weekOverWeekChange)}`}>
                      {metro.weekOverWeekChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : metro.weekOverWeekChange < 0 ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      {metro.weekOverWeekChange > 0 ? "+" : ""}{metro.weekOverWeekChange}
                    </span>
                  </div>
                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Gap</div>
                    <span className={`text-sm font-mono tabular-nums ${gapColor(metro.vibesGap)}`}>
                      {metro.vibesGap > 0 ? "+" : ""}{metro.vibesGap}
                    </span>
                  </div>
                </div>
                <div className={`flex items-center gap-1 text-xs ${trendColor(metro.trend)}`}>
                  <TrendIcon trend={metro.trend} />
                  <span className="capitalize">{metro.trend}</span>
                </div>
              </div>
            </Link>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </section>
  );
}
