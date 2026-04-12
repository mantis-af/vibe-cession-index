"use client";

import Link from "next/link";
import { Metro } from "@/lib/types";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion";
import { DollarSign, Home, ChevronRight } from "lucide-react";

interface Props {
  metros: Metro[];
}

function affordColor(score: number): string {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-lime-600";
  if (score >= 25) return "text-amber-600";
  return "text-red-600";
}

function affordBg(score: number): string {
  if (score >= 75) return "bg-emerald-50";
  if (score >= 50) return "bg-lime-50";
  if (score >= 25) return "bg-amber-50";
  return "bg-red-50";
}

function affordLabel(score: number): string {
  if (score >= 75) return "Affordable";
  if (score >= 50) return "Moderate";
  if (score >= 25) return "Stretched";
  return "Unaffordable";
}

export function AffordabilitySection({ metros }: Props) {
  const withAff = metros
    .filter((m) => m.context?.affordability?.score !== undefined)
    .map((m) => ({
      ...m,
      aff: m.context.affordability!,
    }));

  if (withAff.length === 0) return null;

  const sorted = [...withAff].sort((a, b) => b.aff.score - a.aff.score);
  const avgBurden = withAff.reduce((s, m) => s + m.aff.housingBurden, 0) / withAff.length;
  const affordable = withAff.filter((m) => m.aff.housingBurden < 30).length;
  const stretched = withAff.filter((m) => m.aff.housingBurden >= 30 && m.aff.housingBurden < 50).length;
  const unaffordable = withAff.filter((m) => m.aff.housingBurden >= 50).length;

  return (
    <section className="relative px-4 sm:px-6 lg:px-8 py-16 md:py-24 max-w-7xl mx-auto">
      <FadeIn>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-300/30 to-transparent" />
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl tracking-tight text-foreground mb-2">
          <span className="font-[family-name:var(--font-instrument)] italic">Affordability Index</span>
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mb-10">
          Can people actually afford to live there? Combining median household income, home prices, mortgage rates,
          local inflation, and gas costs into a single affordability score per metro.
        </p>
      </FadeIn>

      {/* Summary */}
      <FadeIn delay={0.05}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-200 rounded-2xl overflow-hidden mb-10">
          <div className="bg-white px-5 py-4 text-center">
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Avg Housing Burden</div>
            <div className={`text-2xl font-mono font-bold ${avgBurden > 35 ? "text-red-600" : "text-amber-600"}`}>
              {avgBurden.toFixed(0)}%
            </div>
            <div className="text-[10px] text-muted-foreground">of income to mortgage</div>
          </div>
          <div className="bg-white px-5 py-4 text-center">
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Affordable</div>
            <div className="text-2xl font-mono font-bold text-emerald-600">{affordable}</div>
            <div className="text-[10px] text-muted-foreground">metros under 30%</div>
          </div>
          <div className="bg-white px-5 py-4 text-center">
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Stretched</div>
            <div className="text-2xl font-mono font-bold text-amber-600">{stretched}</div>
            <div className="text-[10px] text-muted-foreground">metros 30-50%</div>
          </div>
          <div className="bg-white px-5 py-4 text-center">
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Unaffordable</div>
            <div className="text-2xl font-mono font-bold text-red-600">{unaffordable}</div>
            <div className="text-[10px] text-muted-foreground">metros above 50%</div>
          </div>
        </div>
      </FadeIn>

      {/* Ranked table */}
      <FadeIn delay={0.1}>
        <div className="surface rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="hidden md:grid grid-cols-[2.5rem_1fr_5rem_6rem_6rem_5rem_5rem_2rem] gap-3 items-center px-5 py-2.5 border-b border-zinc-100 text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
            <span>#</span>
            <span>Metro</span>
            <span className="text-right">Score</span>
            <span className="text-right">Income</span>
            <span className="text-right">Home</span>
            <span className="text-right">Mortgage</span>
            <span className="text-right">Burden</span>
            <span />
          </div>

          <StaggerContainer className="divide-y divide-zinc-50" staggerDelay={0.03}>
            {sorted.map((m, i) => (
              <StaggerItem key={m.id}>
                {/* Desktop */}
                <Link
                  href={`/metro/${m.id}`}
                  className="hidden md:grid grid-cols-[2.5rem_1fr_5rem_6rem_6rem_5rem_5rem_2rem] gap-3 items-center px-5 py-3 group hover:bg-zinc-50 transition-colors"
                >
                  <span className="text-xs font-mono text-muted-foreground">{i + 1}</span>
                  <span className="text-sm font-medium text-foreground group-hover:text-indigo-600 transition-colors">
                    {m.name}, {m.state}
                  </span>
                  <span className={`text-right text-lg font-mono font-bold ${affordColor(m.aff.score)}`}>
                    {m.aff.score}
                  </span>
                  <span className="text-right text-sm font-mono text-muted-foreground">
                    ${(m.aff.income / 1000).toFixed(0)}K
                  </span>
                  <span className="text-right text-sm font-mono text-muted-foreground">
                    ${(m.aff.homePrice / 1000).toFixed(0)}K
                  </span>
                  <span className="text-right text-sm font-mono text-muted-foreground">
                    ${m.aff.monthlyMortgage.toLocaleString()}
                  </span>
                  <span className={`text-right text-sm font-mono font-semibold ${m.aff.housingBurden < 30 ? "text-emerald-600" : m.aff.housingBurden < 50 ? "text-amber-600" : "text-red-600"}`}>
                    {m.aff.housingBurden.toFixed(0)}%
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-300 group-hover:text-indigo-500 transition-colors" />
                </Link>
                {/* Mobile */}
                <Link
                  href={`/metro/${m.id}`}
                  className="md:hidden flex items-center justify-between px-4 py-3 group hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}</span>
                    <div>
                      <span className="text-sm font-medium text-foreground group-hover:text-indigo-600 transition-colors">
                        {m.name}
                      </span>
                      <div className="text-[10px] text-muted-foreground">
                        ${(m.aff.homePrice / 1000).toFixed(0)}K home · ${m.aff.monthlyMortgage}/mo
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-mono font-bold ${affordColor(m.aff.score)}`}>{m.aff.score}</span>
                    <div className={`text-[10px] font-mono ${m.aff.housingBurden < 30 ? "text-emerald-600" : m.aff.housingBurden < 50 ? "text-amber-600" : "text-red-600"}`}>
                      {m.aff.housingBurden.toFixed(0)}% burden
                    </div>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </FadeIn>

      <FadeIn delay={0.2}>
        <p className="text-[10px] text-muted-foreground mt-4 px-1">
          Housing burden = annual mortgage payment (30yr fixed at current rate, 20% down) / median household income.
          Score incorporates local inflation and gas costs. Based on Zillow ZHVI, FRED income data, and BLS CPI.
          The 30% threshold is the standard benchmark for housing affordability.
        </p>
      </FadeIn>
    </section>
  );
}
