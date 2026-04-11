"use client";

import { SentimentDrivers } from "@/lib/load-data";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion";
import { ArrowUpRight, ArrowDownRight, Minus, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";

const SIGNAL_DISPLAY_NAMES: Record<string, string> = {
  google_trends_anxiety: "Search Anxiety",
  unemployment_rate: "Unemployment Rate",
  initial_claims: "Unemployment Claims",
  housing_inventory: "Housing Inventory",
  housing_dom: "Days on Market",
  housing_price_drops: "Price Drops",
  job_postings: "Job Postings",
  small_biz_health: "Small Biz Health",
};

const SIGNAL_EXPLANATIONS: Record<string, { up: string; down: string }> = {
  google_trends_anxiety: {
    up: "Fewer distress searches (unemployment, food stamps, payday loans) relative to aspiration searches (new job, starting a business)",
    down: "More people searching for financial distress terms — unemployment benefits, debt relief, side hustle",
  },
  unemployment_rate: {
    up: "Metro unemployment rates declining — more people finding work",
    down: "Unemployment ticking up — labor market softening in tracked metros",
  },
  initial_claims: {
    up: "Fewer people filing initial unemployment claims — layoffs decelerating",
    down: "Rising initial claims — more people losing jobs this week vs last",
  },
  housing_inventory: {
    up: "Housing inventory tightening — demand absorbing available supply",
    down: "Inventory building up — homes sitting unsold as buyer confidence wanes",
  },
  housing_dom: {
    up: "Homes selling faster — days on market declining signals buyer urgency",
    down: "Homes taking longer to sell — rising days on market signals buyer hesitation",
  },
  housing_price_drops: {
    up: "Fewer sellers cutting prices — market holding firm",
    down: "More sellers reducing asking prices — a leading indicator of price corrections",
  },
};

interface Props {
  drivers: SentimentDrivers;
}

export function DriversSection({ drivers }: Props) {
  if (!drivers.drivers.length) return null;

  const draggers = drivers.drivers.filter((d) => d.scoreImpact < -0.3);
  const boosters = drivers.drivers.filter((d) => d.scoreImpact > 0.3);
  const neutral = drivers.drivers.filter((d) => Math.abs(d.scoreImpact) <= 0.3);

  return (
    <section className="relative px-4 sm:px-6 lg:px-8 py-16 md:py-24 max-w-7xl mx-auto">
      <FadeIn>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-300/30 to-transparent" />
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl tracking-tight text-foreground mb-2">
          <span className="font-[family-name:var(--font-instrument)] italic">What&apos;s Driving Sentiment</span>
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mb-10">
          Which factors moved the national index over the past month — comparing the last 4 weeks to the prior 4 weeks.
        </p>
      </FadeIn>

      {/* Period summary */}
      <FadeIn delay={0.05}>
        <div className="surface rounded-2xl p-5 sm:p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Prior 4 wk</div>
                <div className="text-2xl font-mono font-bold text-muted-foreground">{drivers.priorAvg}</div>
              </div>
              <div className={`text-xl ${drivers.periodChange >= 0 ? "text-emerald-600" : "text-red-600"}`}>→</div>
              <div className="text-center">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Last 4 wk</div>
                <div className="text-2xl font-mono font-bold text-foreground">{drivers.recentAvg}</div>
              </div>
            </div>
            <div className="flex-1">
              <div className={`text-lg font-semibold flex items-center gap-2 ${drivers.periodChange >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {drivers.periodChange >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                {drivers.periodChange > 0 ? "+" : ""}{drivers.periodChange} points over the period
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Decomposed below by signal contribution — which factors are pulling the index {drivers.periodChange >= 0 ? "up" : "down"}.
              </p>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Driver waterfall */}
      <StaggerContainer className="space-y-3" staggerDelay={0.06}>
        {/* Negative drivers first (what's hurting) */}
        {draggers.length > 0 && (
          <StaggerItem>
            <div className="flex items-center gap-2 mb-2 mt-2">
              <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
              <span className="text-xs font-mono uppercase tracking-wider text-red-600">Dragging sentiment down</span>
            </div>
          </StaggerItem>
        )}
        {draggers.map((d) => (
          <StaggerItem key={d.signal}>
            <DriverCard driver={d} />
          </StaggerItem>
        ))}

        {/* Positive drivers */}
        {boosters.length > 0 && (
          <StaggerItem>
            <div className="flex items-center gap-2 mb-2 mt-6">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-600">Boosting sentiment</span>
            </div>
          </StaggerItem>
        )}
        {boosters.map((d) => (
          <StaggerItem key={d.signal}>
            <DriverCard driver={d} />
          </StaggerItem>
        ))}

        {/* Neutral */}
        {neutral.length > 0 && (
          <StaggerItem>
            <div className="flex items-center gap-2 mb-2 mt-6">
              <Minus className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">Holding steady</span>
            </div>
          </StaggerItem>
        )}
        {neutral.map((d) => (
          <StaggerItem key={d.signal}>
            <DriverCard driver={d} />
          </StaggerItem>
        ))}
      </StaggerContainer>
    </section>
  );
}

function DriverCard({ driver }: { driver: SentimentDrivers["drivers"][0] }) {
  const name = SIGNAL_DISPLAY_NAMES[driver.signal] || driver.signal;
  const explanation = SIGNAL_EXPLANATIONS[driver.signal]?.[driver.direction === "up" ? "up" : "down"]
    || (driver.direction === "up" ? "Improving" : driver.direction === "down" ? "Deteriorating" : "Stable");
  const impactColor = driver.scoreImpact > 0 ? "text-emerald-600" : driver.scoreImpact < 0 ? "text-red-600" : "text-zinc-500";
  const barWidth = Math.min(100, Math.abs(driver.scoreImpact) * 15);
  const barColor = driver.scoreImpact > 0 ? "#22c55e" : driver.scoreImpact < 0 ? "#ef4444" : "#a1a1aa";

  return (
    <div className="surface rounded-xl p-4 sm:p-5 group hover:border-zinc-200 transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
        {/* Signal name + impact */}
        <div className="flex items-center justify-between sm:justify-start sm:min-w-[240px] gap-3">
          <div className="flex items-center gap-2">
            {driver.direction === "up" ? (
              <ArrowUpRight className="h-4 w-4 text-emerald-600" />
            ) : driver.direction === "down" ? (
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            ) : (
              <Minus className="h-4 w-4 text-zinc-500" />
            )}
            <span className="text-sm font-semibold text-foreground">{name}</span>
          </div>
          <span className={`text-sm font-mono font-bold tabular-nums ${impactColor}`}>
            {driver.scoreImpact > 0 ? "+" : ""}{driver.scoreImpact} pts
          </span>
        </div>

        {/* Impact bar */}
        <div className="flex-1">
          <div className="relative h-2 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 rounded-full transition-all duration-700"
              style={{
                width: `${Math.max(2, barWidth)}%`,
                backgroundColor: barColor,
                left: driver.scoreImpact >= 0 ? "50%" : `${50 - barWidth}%`,
                opacity: 0.7,
              }}
            />
            <div className="absolute inset-y-0 left-1/2 w-px bg-zinc-600" />
          </div>
        </div>

        {/* Weight badge */}
        <span className="hidden sm:inline text-[10px] font-mono text-muted-foreground bg-zinc-100 px-2 py-0.5 rounded-full">
          {Math.round(driver.weight * 100)}% weight
        </span>
      </div>

      {/* Explanation */}
      <p className="text-xs text-muted-foreground mt-2.5 leading-relaxed">
        {explanation}
      </p>
    </div>
  );
}
