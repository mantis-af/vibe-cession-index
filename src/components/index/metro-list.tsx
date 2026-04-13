"use client";

import { useState } from "react";
import Link from "next/link";
import { Metro } from "@/lib/types";
import { scoreColor, trendColor, changeColor, gapColor } from "@/lib/colors";
import { Search, TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react";

export function MetroList({ metros }: { metros: Metro[] }) {
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
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Metro Rankings</h2>
          <p className="text-sm text-muted-foreground">{metros.length} metros — click any for detail</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter metros..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm bg-white border border-zinc-200 rounded-lg w-44 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-200"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="py-1.5 px-2.5 text-xs bg-white border border-zinc-200 rounded-lg text-muted-foreground focus:outline-none"
          >
            <option value="score">Score</option>
            <option value="change">Change</option>
            <option value="gap">Gap</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      <div className="space-y-px">
        {sorted.map((metro, idx) => (
          <Link
            key={metro.id}
            href={`/metro/${metro.id}`}
            className="group flex items-center gap-4 py-3 px-3 -mx-3 rounded-lg hover:bg-zinc-50 transition-colors"
          >
            {/* Rank */}
            <span className="text-xs font-mono text-muted-foreground w-6 text-right flex-shrink-0">
              {idx + 1}
            </span>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-foreground group-hover:text-indigo-600 transition-colors">
                {metro.name}
              </span>
              <span className="text-xs text-muted-foreground ml-1.5">{metro.state}</span>
            </div>

            {/* Score */}
            <span className="text-lg font-mono font-bold tabular-nums w-10 text-right" style={{ color: scoreColor(metro.currentScore) }}>
              {metro.currentScore}
            </span>

            {/* Change */}
            <span className={`hidden sm:flex items-center gap-0.5 text-xs font-mono w-10 justify-end ${changeColor(metro.weekOverWeekChange)}`}>
              {metro.weekOverWeekChange > 0 ? "+" : ""}{metro.weekOverWeekChange}
            </span>

            {/* Gap */}
            <span className={`hidden sm:block text-xs font-mono w-10 text-right ${gapColor(metro.vibesGap)}`}>
              {metro.vibesGap > 0 ? "+" : ""}{metro.vibesGap}
            </span>

            {/* Trend */}
            <span className={`hidden md:flex items-center gap-1 text-xs w-20 ${trendColor(metro.trend)}`}>
              {metro.trend === "improving" ? <TrendingUp className="h-3 w-3" /> : metro.trend === "declining" ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {metro.trend}
            </span>

            <ChevronRight className="h-4 w-4 text-zinc-200 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
          </Link>
        ))}
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-12 text-sm text-muted-foreground">No metros match &ldquo;{query}&rdquo;</div>
      )}
    </div>
  );
}
