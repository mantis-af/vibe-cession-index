import { METROS, NATIONAL_SUMMARY, NATIONAL_QUARTERLY, NATIONAL_DRIVERS, MACRO_DATA, NATIONAL_CPI, GAS_NATIONAL, EXPANDED_DATA, GENERATED_AT } from "@/lib/load-data";
import { Header } from "@/components/dashboard/header";
import { HeroSection } from "@/components/dashboard/hero-section";
import { AggregateSection } from "@/components/dashboard/aggregate-section";
import { MacroContext } from "@/components/dashboard/macro-context";
import { QuarterlySection } from "@/components/dashboard/quarterly-section";
import { DriversSection } from "@/components/dashboard/drivers-section";
import { AiImpactSection } from "@/components/dashboard/ai-impact-section";
import { MetroGrid } from "@/components/dashboard/metro-grid";

export default function Home() {
  const lastUpdated = GENERATED_AT
    ? new Date(GENERATED_AT).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "";

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero — big national score, full viewport */}
      <HeroSection summary={NATIONAL_SUMMARY} />

      {/* Aggregate US section — national trend + sentiment gap + signal highlights */}
      <AggregateSection metros={METROS} summary={NATIONAL_SUMMARY} drivers={NATIONAL_DRIVERS} />

      {/* Macro Context — GDP, CPI, unemployment, rates, gas, markets */}
      <MacroContext macro={MACRO_DATA} expanded={EXPANDED_DATA} cpi={NATIONAL_CPI} gas={GAS_NATIONAL} />

      {/* Quarterly Benchmarks — QoQ comparison cards */}
      <QuarterlySection quarterly={NATIONAL_QUARTERLY} />

      {/* Sentiment Drivers — what's pulling the index up or down */}
      <DriversSection drivers={NATIONAL_DRIVERS} />

      {/* AI Economic Impact — which metros are seeing AI reshape labor */}
      <AiImpactSection metros={METROS} />

      {/* Metro Rankings — sleek table with sparklines */}
      <MetroGrid metros={METROS} />

      {/* Footer */}
      <footer className="relative border-t border-zinc-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="text-sm font-semibold text-foreground mb-1 font-[family-name:var(--font-playfair)] italic">Undercurrent</div>
              <div className="text-xs text-muted-foreground">
                Behavioral economic intelligence for 20 US metros.
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
