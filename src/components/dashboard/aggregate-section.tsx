"use client";

import { Metro, NationalSummary } from "@/lib/types";
import { SentimentDrivers } from "@/lib/load-data";
import { scoreColor, gapColor, gapLabel } from "@/lib/colors";
import { FadeIn, StaggerContainer, StaggerItem, CountUp } from "@/components/motion";
import { CompositeTrendChart } from "@/components/charts/composite-trend-chart";
import { VibesGapChart } from "@/components/charts/vibes-gap-chart";
import { MetroWeeklySnapshot } from "@/lib/types";

const SIGNAL_NAMES: Record<string, string> = {
  google_trends_anxiety: "Search Anxiety",
  unemployment_rate: "Unemployment",
  initial_claims: "Jobless Claims",
  housing_inventory: "Housing Supply",
  housing_dom: "Days on Market",
  housing_price_drops: "Price Drops",
};

const SIGNAL_DETAIL: Record<string, { up: string; down: string }> = {
  google_trends_anxiety: {
    up: "Fewer distress searches — people searching less for unemployment benefits, food stamps, and payday loans relative to job and business terms",
    down: "Rising economic anxiety in search behavior — more people looking up unemployment benefits, debt relief, and side hustle opportunities",
  },
  unemployment_rate: {
    up: "Metro unemployment rates are declining — labor markets strengthening across tracked areas",
    down: "Unemployment edging higher — labor demand softening in key metropolitan areas",
  },
  initial_claims: {
    up: "Fewer initial unemployment claims filed this period — layoff activity decelerating",
    down: "Rising weekly jobless claims — more workers filing for unemployment insurance",
  },
  housing_inventory: {
    up: "Housing inventory tightening — available homes being absorbed by active buyers",
    down: "Inventory building — more homes sitting on the market as buyer demand cools",
  },
  housing_dom: {
    up: "Homes selling faster — declining days on market signals confident, active buyers",
    down: "Homes lingering longer — rising days on market as buyers pull back or negotiate harder",
  },
  housing_price_drops: {
    up: "Fewer sellers cutting their asking prices — market confidence holding",
    down: "More sellers reducing prices — a leading indicator that price corrections are spreading",
  },
};

function computeNationalHistory(metros: Metro[]): MetroWeeklySnapshot[] {
  if (metros.length === 0) return [];
  const weekCount = metros[0].history.length;
  const result: MetroWeeklySnapshot[] = [];

  for (let w = 0; w < weekCount; w++) {
    let sumComposite = 0;
    let sumOfficial = 0;
    let count = 0;
    for (const m of metros) {
      if (m.history[w]) {
        sumComposite += m.history[w].compositeScore;
        sumOfficial += m.history[w].officialIndex;
        count++;
      }
    }
    const avgComposite = Math.round(sumComposite / count);
    const avgOfficial = Math.round(sumOfficial / count);
    result.push({
      week: metros[0].history[w].week,
      compositeScore: avgComposite,
      officialIndex: avgOfficial,
      vibesGap: avgComposite - avgOfficial,
      signals: metros[0].history[w].signals, // placeholder
    });
  }
  return result;
}

export function AggregateSection({ metros, summary, drivers }: { metros: Metro[]; summary: NationalSummary; drivers: SentimentDrivers }) {
  const nationalHistory = computeNationalHistory(metros);

  return (
    <section className="relative px-4 sm:px-6 lg:px-8 py-16 md:py-24 max-w-7xl mx-auto">
      {/* Section header */}
      <FadeIn>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-300/30 to-transparent" />
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl tracking-tight text-foreground mb-2">
          <span className="font-[family-name:var(--font-instrument)] italic">National Pulse</span>
        </h2>
        <p className="text-muted-foreground max-w-xl mb-12">
          Aggregate behavioral signals across all 20 tracked metros — how does America feel right now?
        </p>
      </FadeIn>

      {/* Two-column: Trend chart + Sentiment Gap */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-16">
        <FadeIn delay={0.1} className="lg:col-span-3">
          <div className="surface rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Behavioral vs. Official Index</h3>
                <p className="text-xs text-muted-foreground mt-0.5">National average across 50 metros</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-6 h-[2px] rounded bg-indigo-500" />
                  Behavioral
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-6 h-[2px] rounded bg-slate-400 opacity-50" style={{ borderTop: "2px dashed", background: "transparent" }} />
                  Official
                </span>
              </div>
            </div>
            <CompositeTrendChart history={nationalHistory} showOfficial />
          </div>
        </FadeIn>

        <FadeIn delay={0.2} className="lg:col-span-2">
          <div className="surface rounded-2xl p-6 h-full flex flex-col">
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-foreground">The Sentiment Gap</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Behavioral minus Official. Are people feeling better or worse than the numbers say?
              </p>
            </div>
            <div className="flex-1">
              <VibesGapChart history={nationalHistory} />
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-200">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Current gap</span>
                <span className={`text-lg font-mono font-bold ${gapColor(summary.averageVibesGap)}`}>
                  {summary.averageVibesGap > 0 ? "+" : ""}{summary.averageVibesGap.toFixed(1)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {gapLabel(summary.averageVibesGap)}
              </div>
            </div>
          </div>
        </FadeIn>
      </div>

      {/* Signal Highlights — driven by real data */}
      <FadeIn delay={0.15}>
        <h3 className="text-lg font-semibold text-foreground mb-4">Key Signal Movers</h3>
      </FadeIn>
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-4" staggerDelay={0.1}>
        {drivers.drivers.slice(0, 3).map((d) => {
          const name = SIGNAL_NAMES[d.signal] || d.signal;
          const tone: "good" | "warn" | "bad" = d.scoreImpact > 0.3 ? "good" : d.scoreImpact < -0.3 ? "bad" : "warn";
          const detail = SIGNAL_DETAIL[d.signal]?.[d.direction === "up" ? "up" : "down"] || "";
          return (
            <StaggerItem key={d.signal}>
              <SignalHighlight
                title={name}
                description={detail}
                metric={`${d.scoreImpact > 0 ? "+" : ""}${d.scoreImpact} pts`}
                metricLabel="index impact"
                tone={tone}
              />
            </StaggerItem>
          );
        })}
      </StaggerContainer>
    </section>
  );
}

function SignalHighlight({
  title,
  description,
  metric,
  metricLabel,
  tone,
}: {
  title: string;
  description: string;
  metric: string;
  metricLabel: string;
  tone: "good" | "warn" | "bad";
}) {
  const toneColors = {
    good: "text-emerald-700",
    warn: "text-amber-700",
    bad: "text-red-700",
  };
  const dotColor = {
    good: "bg-emerald-500",
    warn: "bg-amber-500",
    bad: "bg-red-500",
  };

  return (
    <div className="surface rounded-xl p-5 group hover:border-zinc-300 transition-all duration-300">
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor[tone]}`} />
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed mb-4">{description}</p>
      <div className="flex items-end justify-between">
        <div>
          <div className={`text-2xl font-mono font-bold ${toneColors[tone].split(" ")[0]}`}>
            {metric}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
            {metricLabel}
          </div>
        </div>
      </div>
    </div>
  );
}
