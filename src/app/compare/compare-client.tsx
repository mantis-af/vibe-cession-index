"use client";

import { useState } from "react";
import { Metro } from "@/lib/types";
import { scoreColor, changeColor, gapColor } from "@/lib/colors";
import { FadeIn } from "@/components/motion";
import { MultiMetroChart, METRO_CHART_PALETTE } from "@/components/charts/multi-metro-chart";
import { X, Plus, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface Props {
  allMetros: Metro[];
  initialIds: string[];
}

export function CompareClient({ allMetros, initialIds }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds);

  const selected = selectedIds
    .map((id) => allMetros.find((m) => m.id === id))
    .filter(Boolean) as Metro[];

  const available = allMetros.filter((m) => !selectedIds.includes(m.id));

  function addMetro(id: string) {
    if (selectedIds.length < 6) {
      setSelectedIds([...selectedIds, id]);
    }
  }

  function removeMetro(id: string) {
    setSelectedIds(selectedIds.filter((i) => i !== id));
  }

  return (
    <div className="space-y-8">
      {/* Metro selector */}
      <FadeIn>
        <div className="surface rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Selected Metros</h3>
              <p className="text-xs text-muted-foreground">Choose up to 6 metros to compare</p>
            </div>
            <span className="text-xs font-mono text-muted-foreground">{selected.length}/6</span>
          </div>

          {/* Selected tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {selected.map((metro, i) => (
              <button
                key={metro.id}
                onClick={() => removeMetro(metro.id)}
                className="group flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg border transition-all duration-200 hover:border-red-300"
                style={{
                  borderColor: `${METRO_CHART_PALETTE[i % METRO_CHART_PALETTE.length]}40`,
                  backgroundColor: `${METRO_CHART_PALETTE[i % METRO_CHART_PALETTE.length]}10`,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: METRO_CHART_PALETTE[i % METRO_CHART_PALETTE.length] }}
                />
                <span className="text-sm text-foreground">{metro.name}, {metro.state}</span>
                <X className="h-3.5 w-3.5 text-muted-foreground group-hover:text-red-600 transition-colors" />
              </button>
            ))}
            {selected.length < 6 && (
              <div className="relative group">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-zinc-200 text-sm text-muted-foreground hover:border-indigo-300 hover:text-indigo-500 transition-all">
                  <Plus className="h-3.5 w-3.5" />
                  Add metro
                </button>
                {/* Dropdown */}
                <div className="absolute top-full left-0 mt-1 w-64 max-h-64 overflow-y-auto surface rounded-xl p-1 opacity-0 pointer-events-none group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition-all z-50">
                  {available.map((metro) => (
                    <button
                      key={metro.id}
                      onClick={() => addMetro(metro.id)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-foreground hover:bg-zinc-100 transition-colors"
                    >
                      <span>{metro.name}, {metro.state}</span>
                      <span className="font-mono text-xs" style={{ color: scoreColor(metro.currentScore) }}>
                        {metro.currentScore}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </FadeIn>

      {selected.length > 0 && (
        <>
          {/* Stat comparison table */}
          <FadeIn delay={0.05}>
            <div className="surface rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200">
                    <th className="text-left px-5 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Metro</th>
                    <th className="text-right px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Score</th>
                    <th className="text-right px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">WoW</th>
                    <th className="text-right px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Trend</th>
                    <th className="text-right px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Gap</th>
                    <th className="text-right px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Pop.</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.map((metro, i) => (
                    <tr key={metro.id} className="border-b border-zinc-100 last:border-0">
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: METRO_CHART_PALETTE[i % METRO_CHART_PALETTE.length] }}
                          />
                          <span className="font-medium text-foreground">{metro.name}, {metro.state}</span>
                        </span>
                      </td>
                      <td className="text-right px-4 py-3 font-mono font-bold" style={{ color: scoreColor(metro.currentScore) }}>
                        {metro.currentScore}
                      </td>
                      <td className={`text-right px-4 py-3 font-mono ${changeColor(metro.weekOverWeekChange)}`}>
                        <span className="inline-flex items-center gap-0.5">
                          {metro.weekOverWeekChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : metro.weekOverWeekChange < 0 ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                          {metro.weekOverWeekChange > 0 ? "+" : ""}{metro.weekOverWeekChange}
                        </span>
                      </td>
                      <td className="text-right px-4 py-3 text-xs capitalize" style={{ color: metro.trend === "improving" ? "#4ade80" : metro.trend === "declining" ? "#f87171" : "#a1a1aa" }}>
                        {metro.trend}
                      </td>
                      <td className={`text-right px-4 py-3 font-mono ${gapColor(metro.vibesGap)}`}>
                        {metro.vibesGap > 0 ? "+" : ""}{metro.vibesGap}
                      </td>
                      <td className="text-right px-4 py-3 text-muted-foreground font-mono">
                        {(metro.population / 1_000_000).toFixed(1)}M
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeIn>

          {/* Composite score chart */}
          <FadeIn delay={0.1}>
            <div className="surface rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-foreground mb-1">Composite Index</h3>
              <p className="text-xs text-muted-foreground mb-4">Behavioral index score — rolling 12 months</p>
              <MultiMetroChart metros={selected} dataKey="compositeScore" />
            </div>
          </FadeIn>

          {/* Sentiment gap chart */}
          <FadeIn delay={0.15}>
            <div className="surface rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-foreground mb-1">Sentiment Gap</h3>
              <p className="text-xs text-muted-foreground mb-4">Behavioral minus Official — positive means people feel better than data suggests</p>
              <MultiMetroChart metros={selected} dataKey="vibesGap" />
            </div>
          </FadeIn>
        </>
      )}

      {selected.length === 0 && (
        <div className="surface rounded-2xl p-16 text-center">
          <p className="text-muted-foreground">Select at to at least one metro above to begin comparing.</p>
        </div>
      )}
    </div>
  );
}
