"use client";

import Link from "next/link";
import { Metro } from "@/lib/types";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion";
import { Home, TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react";

interface Props {
  metros: Metro[];
}

export function HousingSection({ metros }: Props) {
  const withHomeData = metros
    .filter((m) => m.context?.homeValue?.zhvi)
    .map((m) => ({
      ...m,
      zhvi: m.context.homeValue!.zhvi,
      yoy: m.context.homeValue!.yoyPct,
    }));

  if (withHomeData.length === 0) return null;

  const sortedByPrice = [...withHomeData].sort((a, b) => b.zhvi - a.zhvi);
  const sortedByAppreciation = [...withHomeData].sort((a, b) => b.yoy - a.yoy);
  const appreciating = sortedByAppreciation.filter((m) => m.yoy > 0);
  const declining = sortedByAppreciation.filter((m) => m.yoy < 0).reverse(); // worst first

  const medianPrice = sortedByPrice[Math.floor(sortedByPrice.length / 2)].zhvi;
  const avgYoy = withHomeData.reduce((s, m) => s + m.yoy, 0) / withHomeData.length;

  return (
    <section className="relative px-4 sm:px-6 lg:px-8 py-16 md:py-24 max-w-7xl mx-auto">
      <FadeIn>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-300/30 to-transparent" />
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl tracking-tight text-foreground mb-2">
          <span className="font-[family-name:var(--font-instrument)] italic">Housing Market</span>
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mb-10">
          Real home values from Zillow across 20 metros — where prices are rising, where they&apos;re falling, and how
          housing affordability shapes the economic experience.
        </p>
      </FadeIn>

      {/* Summary stats */}
      <FadeIn delay={0.05}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-200 rounded-2xl overflow-hidden mb-10">
          <div className="bg-white px-5 py-4 text-center">
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Median Home Value</div>
            <div className="text-2xl font-mono font-bold text-foreground">${(medianPrice / 1000).toFixed(0)}K</div>
            <div className="text-[10px] text-muted-foreground">across 20 metros</div>
          </div>
          <div className="bg-white px-5 py-4 text-center">
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Avg Appreciation</div>
            <div className={`text-2xl font-mono font-bold ${avgYoy >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {avgYoy > 0 ? "+" : ""}{avgYoy.toFixed(1)}%
            </div>
            <div className="text-[10px] text-muted-foreground">YoY average</div>
          </div>
          <div className="bg-white px-5 py-4 text-center">
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Most Expensive</div>
            <div className="text-2xl font-mono font-bold text-foreground">{sortedByPrice[0].name}</div>
            <div className="text-[10px] text-muted-foreground">${(sortedByPrice[0].zhvi / 1000).toFixed(0)}K</div>
          </div>
          <div className="bg-white px-5 py-4 text-center">
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Biggest Decline</div>
            <div className="text-2xl font-mono font-bold text-red-600">{declining[0]?.name || "—"}</div>
            <div className="text-[10px] text-muted-foreground">{declining[0]?.yoy?.toFixed(1) || "—"}% YoY</div>
          </div>
        </div>
      </FadeIn>

      {/* Two columns: Appreciation vs Decline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {appreciating.length > 0 && (
          <FadeIn delay={0.1}>
            <div className="surface rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-foreground">Appreciating Markets</h3>
              </div>
              <StaggerContainer className="space-y-1.5" staggerDelay={0.03}>
                {appreciating.map((m) => (
                  <StaggerItem key={m.id}>
                    <Link
                      href={`/metro/${m.id}`}
                      className="group flex items-center justify-between py-2 px-3 rounded-lg hover:bg-zinc-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-foreground group-hover:text-indigo-600 transition-colors">
                          {m.name}, {m.state}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-mono text-muted-foreground">${(m.zhvi / 1000).toFixed(0)}K</span>
                        <span className="text-sm font-mono font-bold text-emerald-600 w-16 text-right">
                          +{m.yoy.toFixed(1)}%
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-zinc-300 group-hover:text-indigo-500 transition-colors" />
                      </div>
                    </Link>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </FadeIn>
        )}

        {declining.length > 0 && (
          <FadeIn delay={0.15}>
            <div className="surface rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <h3 className="text-sm font-semibold text-foreground">Declining Markets</h3>
              </div>
              <StaggerContainer className="space-y-1.5" staggerDelay={0.03}>
                {declining.map((m) => (
                  <StaggerItem key={m.id}>
                    <Link
                      href={`/metro/${m.id}`}
                      className="group flex items-center justify-between py-2 px-3 rounded-lg hover:bg-zinc-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-foreground group-hover:text-indigo-600 transition-colors">
                          {m.name}, {m.state}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-mono text-muted-foreground">${(m.zhvi / 1000).toFixed(0)}K</span>
                        <span className="text-sm font-mono font-bold text-red-600 w-16 text-right">
                          {m.yoy.toFixed(1)}%
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-zinc-300 group-hover:text-indigo-500 transition-colors" />
                      </div>
                    </Link>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </FadeIn>
        )}
      </div>
    </section>
  );
}
