"use client";

import { NationalSummary } from "@/lib/types";
import { scoreColor } from "@/lib/colors";
import { FadeIn, CountUp, GlowScore } from "@/components/motion";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";

export function HeroSection({ summary }: { summary: NationalSummary }) {
  const color = scoreColor(summary.averageScore);

  return (
    <section className="relative min-h-[85vh] md:min-h-[90vh] flex flex-col items-center justify-center text-center px-4 sm:px-6 overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-violet-500/[0.04] blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-fuchsia-500/[0.03] blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-500/[0.02] blur-[140px]" />
      </div>

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(oklch(1 0 0 / 0.1) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Eyebrow */}
        <FadeIn delay={0}>
          <div className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground bg-white/[0.03] border border-white/[0.06] rounded-full px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Week of {formatDate(summary.weekOf)} &middot; 20 metros tracked
          </div>
        </FadeIn>

        {/* Main headline */}
        <FadeIn delay={0.1}>
          <h1 className="text-4xl sm:text-5xl md:text-7xl tracking-tight leading-[1.05] mb-4 sm:mb-6">
            <span className="font-[family-name:var(--font-playfair)] italic gradient-text">Undercurrent</span>
            <br />
            <span className="text-foreground font-bold text-2xl sm:text-4xl md:text-5xl">The economy beneath the economy</span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-12 leading-relaxed">
            A real-time behavioral index surfacing how Americans actually experience the economy — beneath the headline numbers, across 20 metros, updated weekly.
          </p>
        </FadeIn>

        {/* National Score - the hero number */}
        <FadeIn delay={0.35}>
          <div className="mb-12">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground mb-4">
              National Composite Score
            </div>
            <GlowScore score={summary.averageScore} color={color} size="xl" />
            <div className="mt-4 text-sm text-muted-foreground">
              out of 100
            </div>
          </div>
        </FadeIn>

        {/* Key metrics row */}
        <FadeIn delay={0.5}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.04] rounded-2xl overflow-hidden max-w-3xl mx-auto">
            <MetricCell
              label="Sentiment Gap"
              value={summary.averageVibesGap}
              format="gap"
            />
            <MetricCell
              label="Best Metro"
              sublabel={summary.highestMetro.name}
              value={summary.highestMetro.score}
              format="score"
            />
            <MetricCell
              label="Worst Metro"
              sublabel={summary.lowestMetro.name}
              value={summary.lowestMetro.score}
              format="score"
            />
            <MetricCell
              label="Trend"
              improving={summary.metrosImproving}
              declining={summary.metrosDeclining}
              stable={summary.metrosStable}
              format="trend"
            />
          </div>
        </FadeIn>

        {/* Scroll hint */}
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

function MetricCell({
  label,
  sublabel,
  value,
  format,
  improving,
  declining,
  stable,
}: {
  label: string;
  sublabel?: string;
  value?: number;
  format: "gap" | "score" | "trend";
  improving?: number;
  declining?: number;
  stable?: number;
}) {
  return (
    <div className="bg-background/50 px-6 py-5 text-center">
      <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-2">
        {label}
      </div>
      {format === "gap" && value !== undefined && (
        <div className={`text-2xl font-mono font-bold ${value >= 0 ? "text-green-400" : "text-red-400"}`}>
          <CountUp target={value} decimals={1} prefix={value >= 0 ? "+" : ""} />
        </div>
      )}
      {format === "score" && value !== undefined && (
        <>
          <div className="text-2xl font-mono font-bold" style={{ color: scoreColor(value) }}>
            <CountUp target={value} />
          </div>
          {sublabel && (
            <div className="text-xs text-muted-foreground mt-1">{sublabel}</div>
          )}
        </>
      )}
      {format === "trend" && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <span className="flex items-center gap-1 text-green-400">
            <TrendingUp className="h-3 w-3" />{improving}
          </span>
          <span className="flex items-center gap-1 text-zinc-500">
            <Minus className="h-3 w-3" />{stable}
          </span>
          <span className="flex items-center gap-1 text-red-400">
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
