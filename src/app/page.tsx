import { METROS, NATIONAL_SUMMARY, NATIONAL_DRIVERS, MACRO_DATA, NATIONAL_CPI, GAS_NATIONAL, EXPANDED_DATA, GENERATED_AT } from "@/lib/load-data";
import narrativeJson from "@/data/narrative.json";
import forecastJson from "@/data/forecast.json";
import { Header } from "@/components/dashboard/header";
import { HeroSection } from "@/components/dashboard/hero-section";
import { AggregateSection } from "@/components/dashboard/aggregate-section";
import { ForecastSection } from "@/components/dashboard/forecast-section";
import { WeeklyNarrative } from "@/components/dashboard/weekly-narrative";
import { UsHeatmap } from "@/components/dashboard/us-heatmap";
import { MetroGrid } from "@/components/dashboard/metro-grid";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Home() {
  const lastUpdated = GENERATED_AT
    ? new Date(GENERATED_AT).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "";

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* 1. Hero — big national score */}
      <HeroSection summary={NATIONAL_SUMMARY} />

      {/* 2. National Pulse — trend chart + sentiment gap + key signal movers */}
      <div id="pulse">
        <AggregateSection metros={METROS} summary={NATIONAL_SUMMARY} drivers={NATIONAL_DRIVERS} />
      </div>

      {/* 3. Forecast — where are official indicators heading */}
      <div id="forecast">
        <ForecastSection
          compositeForecasts={forecastJson.compositeForecasts}
          signalForecasts={forecastJson.signalForecasts}
          lastDataWeek={forecastJson.lastDataWeek}
        />
      </div>

      {/* 4. Weekly Analysis */}
      <div id="narrative">
        <WeeklyNarrative
          headline={narrativeJson.headline}
          weekOf={narrativeJson.weekOf}
          sections={narrativeJson.sections}
        />
      </div>

      {/* 5. National Map */}
      <div id="map">
        <UsHeatmap metros={METROS} />
      </div>

      {/* Deep Insights CTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/insights"
          className="surface rounded-2xl p-6 flex items-center justify-between group hover:border-indigo-300 transition-all"
        >
          <div>
            <h3 className="text-lg font-semibold text-foreground group-hover:text-indigo-600 transition-colors">
              Deep Insights
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Macro indicators, quarterly benchmarks, sentiment drivers, lead/lag analysis, housing market, affordability, AI impact
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

      {/* 6. Metro Rankings */}
      <div id="rankings">
        <MetroGrid metros={METROS} />
      </div>

      {/* Footer */}
      <footer className="relative border-t border-zinc-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="text-sm font-semibold text-foreground mb-1 font-[family-name:var(--font-playfair)] italic">Undercurrent</div>
              <div className="text-xs text-muted-foreground">
                Behavioral economic intelligence for 50 US metros.
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                10 pipelines &middot; 40+ indicators
              </span>
              {lastUpdated && (
                <span>Data updated {lastUpdated}</span>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
