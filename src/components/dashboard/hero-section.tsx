"use client";

import { NationalSummary } from "@/lib/types";
import { scoreColor } from "@/lib/colors";
import { FadeIn, CountUp, GlowScore } from "@/components/motion";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";

export function HeroSection({ summary }: { summary: NationalSummary }) {
  const color = scoreColor(summary.averageScore);

  return (
    <section className="relative min-h-[85vh] md:min-h-[90vh] flex flex-col items-center justify-center text-center px-4 sm:px-6 overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-[600px] bg-gradient-to-b from-indigo-50/50 to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #94a3b8 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        <FadeIn delay={0}>
          <div className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground bg-white border border-zinc-200 rounded-full px-4 py-1.5 mb-8 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Week of {formatDate(summary.weekOf)} &middot; 20 metros tracked
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h1 className="text-4xl sm:text-5xl md:text-7xl tracking-tight leading-[1.05] mb-4 sm:mb-6">
            <span className="font-[family-name:var(--font-playfair)] italic gradient-text">Undercurrent</span>
            <br />
            <span className="text-foreground font-bold text-2xl sm:text-3xl md:text-4xl">The economy beneath the economy</span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-12 leading-relaxed">
            A real-time behavioral index surfacing how Americans actually experience the economy — beneath the headline numbers, across 20 metros, updated weekly.
          </p>
        </FadeIn>

        <FadeIn delay={0.35}>
          <div className="mb-12">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground mb-4">
              National Composite Score
            </div>
            <div className="text-7xl sm:text-8xl md:text-9xl font-mono font-black tabular-nums tracking-tighter" style={{ color }}>
              {summary.averageScore}
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              out of 100
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.5}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-200 rounded-2xl overflow-hidden max-w-3xl mx-auto shadow-sm">
            <MetricCell label="Sentiment Gap" value={summary.averageVibesGap} format="gap" />
            <MetricCell label="Best Metro" sublabel={summary.highestMetro.name} value={summary.highestMetro.score} format="score" />
            <MetricCell label="Worst Metro" sublabel={summary.lowestMetro.name} value={summary.lowestMetro.score} format="score" />
            <MetricCell label="Trend" improving={summary.metrosImproving} declining={summary.metrosDeclining} stable={summary.metrosStable} format="trend" />
          </div>
        </FadeIn>

        <FadeIn delay={0.7}>
          <div className="mt-16 flex flex-col items-center gap-2 text-muted-foreground/50">
            <span className="text-xs tracking-wider uppercase">Explore the data</span>
            <ArrowRight className="h-4 w-4 rotate-90 animate-bounce" />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

function MetricCell({ label, sublabel, value, format, improving, declining, stable }: {
  label: string; sublabel?: string; value?: number; format: "gap" | "score" | "trend";
  improving?: number; declining?: number; stable?: number;
}) {
  return (
    <div className="bg-white px-5 py-4 text-center">
      <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-2">{label}</div>
      {format === "gap" && value !== undefined && (
        <div className={`text-2xl font-mono font-bold ${value >= 0 ? "text-emerald-600" : "text-red-600"}`}>
          <CountUp target={value} decimals={1} prefix={value >= 0 ? "+" : ""} />
        </div>
      )}
      {format === "score" && value !== undefined && (
        <>
          <div className="text-2xl font-mono font-bold" style={{ color: scoreColor(value) }}>
            <CountUp target={value} />
          </div>
          {sublabel && <div className="text-xs text-muted-foreground mt-1">{sublabel}</div>}
        </>
      )}
      {format === "trend" && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <span className="flex items-center gap-1 text-emerald-600">
            <TrendingUp className="h-3 w-3" />{improving}
          </span>
          <span className="flex items-center gap-1 text-zinc-400">
            <Minus className="h-3 w-3" />{stable}
          </span>
          <span className="flex items-center gap-1 text-red-600">
            <TrendingDown className="h-3 w-3" />{declining}
          </span>
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
