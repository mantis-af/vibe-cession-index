"use client";

import { Metro, NationalSummary } from "@/lib/types";
import { scoreColor, gapColor, gapLabel } from "@/lib/colors";
import { FadeIn, StaggerContainer, StaggerItem, CountUp } from "@/components/motion";
import { CompositeTrendChart } from "@/components/charts/composite-trend-chart";
import { VibesGapChart } from "@/components/charts/vibes-gap-chart";
import { MetroWeeklySnapshot } from "@/lib/types";

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

export function AggregateSection({ metros, summary }: { metros: Metro[]; summary: NationalSummary }) {
  const nationalHistory = computeNationalHistory(metros);

  return (
    <section className="relative px-6 lg:px-8 py-24 max-w-7xl mx-auto">
      {/* Section header */}
      <FadeIn>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">
          National Pulse
        </h2>
        <p className="text-muted-foreground max-w-xl mb-12">
          Aggregate behavioral signals across all 20 tracked metros — how does America feel right now?
        </p>
      </FadeIn>

      {/* Two-column: Trend chart + Vibes Gap */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-16">
        <FadeIn delay={0.1} className="lg:col-span-3">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Behavioral vs. Official Index</h3>
                <p className="text-xs text-muted-foreground mt-0.5">National average across 20 metros</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-6 h-[2px] rounded bg-violet-400" />
                  Behavioral
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-6 h-[2px] rounded bg-blue-400 opacity-50" style={{ borderTop: "2px dashed", background: "transparent" }} />
                  Official
                </span>
              </div>
            </div>
            <CompositeTrendChart history={nationalHistory} showOfficial />
          </div>
        </FadeIn>

        <FadeIn delay={0.2} className="lg:col-span-2">
          <div className="glass rounded-2xl p-6 h-full flex flex-col">
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-foreground">The Vibes Gap</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Behavioral minus Official. Are people feeling better or worse than the numbers say?
              </p>
            </div>
            <div className="flex-1">
              <VibesGapChart history={nationalHistory} />
            </div>
            <div className="mt-4 pt-4 border-t border-white/[0.04]">
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

      {/* Signal Highlights - 3 horizontal stat cards */}
      <FadeIn delay={0.15}>
        <h3 className="text-lg font-semibold text-foreground mb-4">Key Signals This Week</h3>
      </FadeIn>
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-4" staggerDelay={0.1}>
        <StaggerItem>
          <SignalHighlight
            title="Search Anxiety"
            description="Google Trends distress-to-aspiration ratio is elevated in 12 of 20 metros"
            metric="12/20"
            metricLabel="metros elevated"
            tone="warn"
          />
        </StaggerItem>
        <StaggerItem>
          <SignalHighlight
            title="Job Postings"
            description="Week-over-week job posting velocity is positive in Texas metros, negative on both coasts"
            metric="+3.2%"
            metricLabel="TX avg growth"
            tone="good"
          />
        </StaggerItem>
        <StaggerItem>
          <SignalHighlight
            title="Housing Market"
            description="Days-on-market rising in 14 metros — inventory building as buyer confidence softens"
            metric="14/20"
            metricLabel="metros rising DOM"
            tone="warn"
          />
        </StaggerItem>
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
    good: "text-green-400 bg-green-400/10 border-green-400/10",
    warn: "text-amber-400 bg-amber-400/10 border-amber-400/10",
    bad: "text-red-400 bg-red-400/10 border-red-400/10",
  };
  const dotColor = {
    good: "bg-green-400",
    warn: "bg-amber-400",
    bad: "bg-red-400",
  };

  return (
    <div className="glass rounded-xl p-5 group hover:border-white/10 transition-all duration-300">
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
