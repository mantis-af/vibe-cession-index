"use client";

import { Metro } from "@/lib/types";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion";
import { Home, Fuel, Brain, Building, BarChart3, TrendingUp, TrendingDown, Minus, DollarSign } from "lucide-react";

export function MetroContextCards({ metro }: { metro: Metro }) {
  const ctx = metro.context;
  if (!ctx || Object.keys(ctx).length === 0) return null;

  const cards: Array<{
    key: string;
    icon: React.ReactNode;
    label: string;
    value: string;
    sublabel: string;
    change?: string;
    dir?: "up" | "down" | "flat";
  }> = [];

  // Home Value
  if (ctx.homeValue) {
    const yoy = ctx.homeValue.yoyPct;
    cards.push({
      key: "home",
      icon: <Home className="h-4 w-4" />,
      label: "Median Home Value",
      value: `$${(ctx.homeValue.zhvi / 1000).toFixed(0)}K`,
      sublabel: `Zillow ZHVI, ${ctx.homeValue.latestMonth}`,
      change: yoy !== undefined ? `${yoy > 0 ? "+" : ""}${yoy.toFixed(1)}% YoY` : undefined,
      dir: yoy !== undefined ? (yoy > 0 ? "up" : yoy < 0 ? "down" : "flat") : undefined,
    });
  }

  // CPI Inflation
  if (ctx.cpi) {
    cards.push({
      key: "cpi",
      icon: <DollarSign className="h-4 w-4" />,
      label: "Local Inflation",
      value: `${ctx.cpi.inflationYoY?.toFixed(1) ?? "N/A"}%`,
      sublabel: `CPI YoY, ${ctx.cpi.latestMonth}`,
      dir: ctx.cpi.inflationYoY > 3 ? "down" : ctx.cpi.inflationYoY < 2 ? "up" : "flat",
    });
  }

  // Gas Price
  if (ctx.gas) {
    cards.push({
      key: "gas",
      icon: <Fuel className="h-4 w-4" />,
      label: "Gas Price",
      value: `$${ctx.gas.price.toFixed(2)}`,
      sublabel: `${ctx.gas.region.replace(/_/g, " ")} region`,
    });
  }

  // AI Momentum
  if (ctx.ai) {
    const ratio = ctx.ai.latestAiRatio;
    const momentum = ctx.ai.aiMomentum;
    cards.push({
      key: "ai",
      icon: <Brain className="h-4 w-4" />,
      label: "AI Job Search",
      value: `${(ratio * 100).toFixed(0)}%`,
      sublabel: "of job searches are AI-related",
      change: `${momentum > 0 ? "+" : ""}${(momentum * 100).toFixed(1)}pp momentum`,
      dir: momentum > 0.01 ? "up" : momentum < -0.01 ? "down" : "flat",
    });
  }

  // New Business Applications
  if (ctx.bizApps) {
    const change = ctx.bizApps.change4wk;
    cards.push({
      key: "biz",
      icon: <Building className="h-4 w-4" />,
      label: "New Businesses",
      value: Math.round(ctx.bizApps.value).toLocaleString(),
      sublabel: `Weekly apps, ${metro.state}`,
      change: change !== null ? `${change > 0 ? "+" : ""}${Math.round(change)} vs 4wk ago` : undefined,
      dir: change !== null ? (change > 0 ? "up" : change < 0 ? "down" : "flat") : undefined,
    });
  }

  // Coincident Index
  if (ctx.coincidentIndex) {
    cards.push({
      key: "coincident",
      icon: <BarChart3 className="h-4 w-4" />,
      label: "Economic Index",
      value: ctx.coincidentIndex.value.toFixed(1),
      sublabel: `${metro.state} coincident index`,
    });
  }

  if (cards.length === 0) return null;

  return (
    <FadeIn delay={0.15}>
      <div className="surface rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-1">Local Economic Context</h3>
        <p className="text-xs text-muted-foreground mb-5">
          Real economic data for the {metro.name} metro — home prices, inflation, AI adoption, and business formation.
        </p>
        <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" staggerDelay={0.04}>
          {cards.map((card) => (
            <StaggerItem key={card.key}>
              <div className="bg-zinc-50 rounded-xl p-3.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-muted-foreground">{card.icon}</span>
                  <span className="text-[10px] font-medium text-muted-foreground truncate">{card.label}</span>
                </div>
                <div className="text-xl font-mono font-bold text-foreground tabular-nums leading-tight">
                  {card.value}
                </div>
                <div className="mt-1.5 space-y-0.5">
                  <div className="text-[10px] text-muted-foreground">{card.sublabel}</div>
                  {card.change && (
                    <div className={`flex items-center gap-0.5 text-[10px] font-mono ${
                      card.dir === "up" ? "text-emerald-600" :
                      card.dir === "down" ? "text-red-600" : "text-zinc-500"
                    }`}>
                      {card.dir === "up" ? <TrendingUp className="h-2.5 w-2.5" /> :
                       card.dir === "down" ? <TrendingDown className="h-2.5 w-2.5" /> :
                       <Minus className="h-2.5 w-2.5" />}
                      {card.change}
                    </div>
                  )}
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </FadeIn>
  );
}
