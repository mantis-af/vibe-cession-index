"use client";

import { QuarterlyBenchmark } from "@/lib/load-data";
import { scoreColor } from "@/lib/colors";
import { FadeIn, StaggerContainer, StaggerItem, CountUp } from "@/components/motion";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface Props {
  quarterly: QuarterlyBenchmark[];
}

export function QuarterlySection({ quarterly }: Props) {
  if (quarterly.length === 0) return null;

  // Current quarter is the last one
  const current = quarterly[quarterly.length - 1];
  const previous = quarterly.length > 1 ? quarterly[quarterly.length - 2] : null;

  return (
    <section className="relative px-4 sm:px-6 lg:px-8 py-16 md:py-24 max-w-7xl mx-auto">
      <FadeIn>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl tracking-tight text-foreground mb-2">
          <span className="font-[family-name:var(--font-instrument)] italic">Quarterly Benchmarks</span>
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mb-10">
          How the national index has moved quarter over quarter — revealing the trajectory beneath week-to-week noise.
        </p>
      </FadeIn>

      {/* Quarterly cards */}
      <StaggerContainer className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-10" staggerDelay={0.08}>
        {quarterly.map((q) => {
          const isCurrent = q.quarter === current.quarter;
          return (
            <StaggerItem key={q.quarter}>
              <div className={`glass rounded-xl p-4 sm:p-5 ${isCurrent ? "ring-1 ring-violet-500/30" : ""}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    {q.quarter}
                  </span>
                  {isCurrent && (
                    <span className="text-[9px] font-mono text-violet-400 bg-violet-400/10 px-1.5 py-0.5 rounded-full uppercase">
                      Current
                    </span>
                  )}
                </div>
                <div className="text-3xl sm:text-4xl font-mono font-bold tabular-nums mb-1" style={{ color: scoreColor(q.avgScore) }}>
                  {q.avgScore}
                </div>
                <div className="flex items-center justify-between text-xs">
                  {q.qoqChange !== null ? (
                    <span className={`flex items-center gap-0.5 font-mono ${q.qoqChange > 0 ? "text-green-400" : q.qoqChange < 0 ? "text-red-400" : "text-zinc-500"}`}>
                      {q.qoqChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : q.qoqChange < 0 ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      {q.qoqChange > 0 ? "+" : ""}{q.qoqChange}
                    </span>
                  ) : (
                    <span className="text-zinc-600 font-mono">baseline</span>
                  )}
                  <span className="text-muted-foreground font-mono">
                    {q.low}–{q.high}
                  </span>
                </div>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {/* Quarter-over-quarter narrative */}
      {previous && current.qoqChange !== null && (
        <FadeIn delay={0.3}>
          <div className="glass rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">{previous.quarter}</div>
                  <div className="text-2xl font-mono font-bold" style={{ color: scoreColor(previous.avgScore) }}>
                    {previous.avgScore}
                  </div>
                </div>
                <div className={`text-xl font-mono font-bold ${current.qoqChange > 0 ? "text-green-400" : "text-red-400"}`}>
                  →
                </div>
                <div className="text-center">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">{current.quarter}</div>
                  <div className="text-2xl font-mono font-bold" style={{ color: scoreColor(current.avgScore) }}>
                    {current.avgScore}
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <div className={`text-lg font-semibold ${current.qoqChange > 0 ? "text-green-400" : "text-red-400"}`}>
                  {current.qoqChange > 0 ? "+" : ""}{current.qoqChange} points quarter-over-quarter
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {current.qoqChange > 3
                    ? "Significant improvement in behavioral sentiment. Multiple signals showing positive momentum."
                    : current.qoqChange > 0
                      ? "Modest improvement. Sentiment is inching in the right direction."
                      : current.qoqChange > -3
                        ? "Slight decline. Behavioral signals softening from the prior quarter."
                        : "Notable deterioration. Key indicators are moving in the wrong direction."}
                </p>
              </div>
            </div>
          </div>
        </FadeIn>
      )}
    </section>
  );
}
