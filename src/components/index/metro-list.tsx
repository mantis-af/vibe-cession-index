"use client";

import { useState } from "react";
import Link from "next/link";
import { Metro } from "@/lib/types";
import { scoreColor, changeColor, trendColor } from "@/lib/colors";
import { Search, TrendingUp, TrendingDown, Minus, ChevronRight, ArrowUpRight, ArrowDownRight } from "lucide-react";

export function MetroList({ metros }: { metros: Metro[] }) {
  const [view, setView] = useState<"highlights" | "all">("highlights");
  const [query, setQuery] = useState("");

  const byScore = [...metros].sort((a, b) => b.currentScore - a.currentScore);
  const byChange = [...metros].sort((a, b) => b.weekOverWeekChange - a.weekOverWeekChange);
  const top5 = byScore.slice(0, 5);
  const bottom5 = byScore.slice(-5).reverse();
  const risers = byChange.filter(m => m.weekOverWeekChange > 0).slice(0, 5);
  const fallers = byChange.filter(m => m.weekOverWeekChange < 0).reverse().slice(0, 5);

  const filtered = query
    ? metros.filter(m => m.name.toLowerCase().includes(query.toLowerCase()) || m.state.toLowerCase().includes(query.toLowerCase()))
    : byScore;

  return (
    <section>
      {/* Header with toggle */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Metros</h2>
          <p className="text-sm text-muted-foreground">{metros.length} tracked</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("highlights")}
            className={`px-3 py-1 text-xs rounded-lg transition-all ${view === "highlights" ? "bg-zinc-100 text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            Highlights
          </button>
          <button
            onClick={() => setView("all")}
            className={`px-3 py-1 text-xs rounded-lg transition-all ${view === "all" ? "bg-zinc-100 text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            All
          </button>
        </div>
      </div>

      {view === "highlights" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Top performing */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Strongest</span>
            </div>
            <div className="space-y-0.5">
              {top5.map((m, i) => <MetroRow key={m.id} metro={m} rank={i + 1} />)}
            </div>
          </div>

          {/* Bottom performing */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              <span className="text-xs font-medium text-red-700 uppercase tracking-wider">Most Stressed</span>
            </div>
            <div className="space-y-0.5">
              {bottom5.map((m, i) => <MetroRow key={m.id} metro={m} rank={metros.length - 4 + i} />)}
            </div>
          </div>

          {/* Biggest risers */}
          {risers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Biggest Gainers This Week</span>
              </div>
              <div className="space-y-0.5">
                {risers.map((m) => <MetroRow key={m.id} metro={m} showChange />)}
              </div>
            </div>
          )}

          {/* Biggest fallers */}
          {fallers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                <span className="text-xs font-medium text-red-700 uppercase tracking-wider">Biggest Decliners This Week</span>
              </div>
              <div className="space-y-0.5">
                {fallers.map((m) => <MetroRow key={m.id} metro={m} showChange />)}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Full list view */
        <div>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter metros..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm bg-white border border-zinc-200 rounded-lg w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>
          <div className="space-y-0.5">
            {filtered.map((m, i) => <MetroRow key={m.id} metro={m} rank={i + 1} />)}
          </div>
        </div>
      )}
    </section>
  );
}

function MetroRow({ metro, rank, showChange }: { metro: Metro; rank?: number; showChange?: boolean }) {
  return (
    <Link
      href={`/metro/${metro.id}`}
      className="group flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-lg hover:bg-zinc-50 transition-colors"
    >
      {rank && (
        <span className="text-[10px] font-mono text-muted-foreground w-5 text-right flex-shrink-0">{rank}</span>
      )}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground group-hover:text-indigo-600 transition-colors">{metro.name}</span>
        <span className="text-xs text-muted-foreground ml-1">{metro.state}</span>
      </div>

      {showChange ? (
        <span className={`text-sm font-mono font-bold tabular-nums ${changeColor(metro.weekOverWeekChange)}`}>
          {metro.weekOverWeekChange > 0 ? "+" : ""}{metro.weekOverWeekChange}
        </span>
      ) : (
        <span className="text-lg font-mono font-bold tabular-nums" style={{ color: scoreColor(metro.currentScore) }}>
          {metro.currentScore}
        </span>
      )}

      <span className={`hidden sm:flex items-center gap-0.5 text-xs w-16 ${trendColor(metro.trend)}`}>
        {metro.trend === "improving" ? <TrendingUp className="h-3 w-3" /> : metro.trend === "declining" ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
        {metro.trend}
      </span>

      <ChevronRight className="h-3.5 w-3.5 text-zinc-200 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
    </Link>
  );
}
