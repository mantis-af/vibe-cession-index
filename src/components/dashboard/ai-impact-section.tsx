"use client";

import Link from "next/link";
import { Metro } from "@/lib/types";
import { scoreColor } from "@/lib/colors";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion";
import { Brain, TrendingUp, TrendingDown, Minus, ArrowUpRight, ChevronRight } from "lucide-react";

interface Props {
  metros: Metro[];
}

export function AiImpactSection({ metros }: Props) {
  // Only metros with AI data
  const withAi = metros
    .filter((m) => m.context?.ai)
    .map((m) => ({
      ...m,
      aiRatio: m.context.ai!.latestAiRatio,
      aiMomentum: m.context.ai!.aiMomentum,
    }));

  if (withAi.length === 0) return null;

  const sortedByRatio = [...withAi].sort((a, b) => b.aiRatio - a.aiRatio);
  const sortedByMomentum = [...withAi].sort((a, b) => b.aiMomentum - a.aiMomentum);
  const avgRatio = withAi.reduce((s, m) => s + m.aiRatio, 0) / withAi.length;
  const avgMomentum = withAi.reduce((s, m) => s + m.aiMomentum, 0) / withAi.length;

  // Top 5 accelerating AI adoption
  const accelerating = sortedByMomentum.slice(0, 5);
  // Top 5 highest AI search share
  const highestAi = sortedByRatio.slice(0, 5);

  return (
    <section className="relative px-4 sm:px-6 lg:px-8 py-16 md:py-24 max-w-7xl mx-auto">
      <FadeIn>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-300/30 to-transparent" />
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl tracking-tight text-foreground mb-2">
          <span className="font-[family-name:var(--font-instrument)] italic">AI Economic Impact</span>
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mb-10">
          Which metros are seeing AI reshape their labor markets? We track the ratio of AI-related job searches
          (AI jobs, ML engineer, prompt engineer) vs traditional searches (warehouse, retail, construction) — revealing
          where the AI transition is most active.
        </p>
      </FadeIn>

      {/* Summary stats */}
      <FadeIn delay={0.05}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-200 rounded-2xl overflow-hidden mb-10">
          <div className="bg-white px-5 py-4 text-center">
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Avg AI Search Share</div>
            <div className="text-2xl font-mono font-bold text-indigo-600">{(avgRatio * 100).toFixed(0)}%</div>
            <div className="text-[10px] text-muted-foreground">across 50 metros</div>
          </div>
          <div className="bg-white px-5 py-4 text-center">
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Avg Momentum</div>
            <div className={`text-2xl font-mono font-bold ${avgMomentum > 0 ? "text-emerald-600" : "text-red-600"}`}>
              {avgMomentum > 0 ? "+" : ""}{(avgMomentum * 100).toFixed(1)}pp
            </div>
            <div className="text-[10px] text-muted-foreground">4-week trend</div>
          </div>
          <div className="bg-white px-5 py-4 text-center">
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Highest AI Share</div>
            <div className="text-2xl font-mono font-bold text-foreground">{highestAi[0].name}</div>
            <div className="text-[10px] text-muted-foreground">{(highestAi[0].aiRatio * 100).toFixed(0)}% AI searches</div>
          </div>
          <div className="bg-white px-5 py-4 text-center">
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Fastest Accelerating</div>
            <div className="text-2xl font-mono font-bold text-foreground">{accelerating[0].name}</div>
            <div className="text-[10px] text-muted-foreground">{(accelerating[0].aiMomentum * 100).toFixed(1)}pp momentum</div>
          </div>
        </div>
      </FadeIn>

      {/* Two columns: AI Leaders + Accelerating */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FadeIn delay={0.1}>
          <div className="surface rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="h-4 w-4 text-indigo-500" />
              <h3 className="text-sm font-semibold text-foreground">Highest AI Job Search Share</h3>
            </div>
            <StaggerContainer className="space-y-2" staggerDelay={0.04}>
              {highestAi.map((metro, i) => (
                <StaggerItem key={metro.id}>
                  <Link
                    href={`/metro/${metro.id}`}
                    className="group flex items-center justify-between py-2 px-3 rounded-lg hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}</span>
                      <span className="text-sm font-medium text-foreground group-hover:text-indigo-600 transition-colors">
                        {metro.name}, {metro.state}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-400" style={{ width: `${metro.aiRatio * 100 * 2.5}%` }} />
                      </div>
                      <span className="text-sm font-mono font-bold text-indigo-600 w-12 text-right">
                        {(metro.aiRatio * 100).toFixed(0)}%
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-zinc-300 group-hover:text-indigo-500 transition-colors" />
                    </div>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>
            <p className="text-[10px] text-muted-foreground mt-3 px-3">
              Higher ratio = more job searches are AI-specific vs traditional roles.
              Tech hubs (SF, SJ) score lower because workers search for specific roles, not generic &ldquo;AI jobs.&rdquo;
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="surface rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <ArrowUpRight className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-foreground">Fastest AI Adoption Acceleration</h3>
            </div>
            <StaggerContainer className="space-y-2" staggerDelay={0.04}>
              {accelerating.map((metro, i) => {
                const mom = metro.aiMomentum;
                return (
                  <StaggerItem key={metro.id}>
                    <Link
                      href={`/metro/${metro.id}`}
                      className="group flex items-center justify-between py-2 px-3 rounded-lg hover:bg-zinc-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}</span>
                        <div>
                          <span className="text-sm font-medium text-foreground group-hover:text-indigo-600 transition-colors">
                            {metro.name}, {metro.state}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            Score: <span className="font-mono" style={{ color: scoreColor(metro.currentScore) }}>{metro.currentScore}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-0.5 text-sm font-mono font-bold ${mom > 0 ? "text-emerald-600" : mom < 0 ? "text-red-600" : "text-zinc-500"}`}>
                          {mom > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : mom < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                          {mom > 0 ? "+" : ""}{(mom * 100).toFixed(1)}pp
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-zinc-300 group-hover:text-indigo-500 transition-colors" />
                      </div>
                    </Link>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
            <p className="text-[10px] text-muted-foreground mt-3 px-3">
              Momentum measures the 4-week change in AI search share. Positive = AI job interest accelerating
              relative to traditional roles. These metros are where the AI transition is moving fastest.
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
