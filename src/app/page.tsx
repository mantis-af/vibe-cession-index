import { METROS, NATIONAL_SUMMARY, NATIONAL_QUARTERLY, NATIONAL_DRIVERS, MACRO_DATA, NATIONAL_CPI, GAS_NATIONAL, EXPANDED_DATA, GENERATED_AT } from "@/lib/load-data";
import narrativeJson from "@/data/narrative.json";
import leadlagJson from "@/data/leadlag.json";
import { Header } from "@/components/dashboard/header";
import { SectionNav } from "@/components/dashboard/section-nav";
import { HeroSection } from "@/components/dashboard/hero-section";
import { AggregateSection } from "@/components/dashboard/aggregate-section";
import { MacroContext } from "@/components/dashboard/macro-context";
import { UsHeatmap } from "@/components/dashboard/us-heatmap";
import { WeeklyNarrative } from "@/components/dashboard/weekly-narrative";
import { QuarterlySection } from "@/components/dashboard/quarterly-section";
import { DriversSection } from "@/components/dashboard/drivers-section";
import { AiImpactSection } from "@/components/dashboard/ai-impact-section";
import { HousingSection } from "@/components/dashboard/housing-section";
import { AffordabilitySection } from "@/components/dashboard/affordability-section";
import { LeadLagSection } from "@/components/dashboard/leadlag-section";
import { MetroGrid } from "@/components/dashboard/metro-grid";

export default function Home() {
  const lastUpdated = GENERATED_AT
    ? new Date(GENERATED_AT).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <SectionNav />

      {/* Hero — big national score, full viewport */}
      <HeroSection summary={NATIONAL_SUMMARY} />

      <div id="pulse" className="scroll-mt-28">
        <AggregateSection metros={METROS} summary={NATIONAL_SUMMARY} drivers={NATIONAL_DRIVERS} />
      </div>

      <div id="narrative" className="scroll-mt-28">
        <WeeklyNarrative
          headline={narrativeJson.headline}
          weekOf={narrativeJson.weekOf}
          sections={narrativeJson.sections}
        />
      </div>

      <div id="map" className="scroll-mt-28">
        <UsHeatmap metros={METROS} />
      </div>

      <div id="macro" className="scroll-mt-28">
        <MacroContext macro={MACRO_DATA} expanded={EXPANDED_DATA} cpi={NATIONAL_CPI} gas={GAS_NATIONAL} />
      </div>

      <div id="quarterly" className="scroll-mt-28">
        <QuarterlySection quarterly={NATIONAL_QUARTERLY} />
      </div>

      <div id="drivers" className="scroll-mt-28">
        <DriversSection drivers={NATIONAL_DRIVERS} />
      </div>

      <div id="predictive" className="scroll-mt-28">
        <LeadLagSection
          national={leadlagJson.national}
          summary={leadlagJson.summary}
          metros={leadlagJson.metros}
        />
      </div>

      <div id="housing" className="scroll-mt-28">
        <HousingSection metros={METROS} />
      </div>

      <div id="affordability" className="scroll-mt-28">
        <AffordabilitySection metros={METROS} />
      </div>

      <div id="ai" className="scroll-mt-28">
        <AiImpactSection metros={METROS} />
      </div>

      <div id="rankings" className="scroll-mt-28">
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
