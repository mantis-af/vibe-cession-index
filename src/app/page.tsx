import { METROS, NATIONAL_SUMMARY, NATIONAL_QUARTERLY, NATIONAL_DRIVERS } from "@/lib/load-data";
import { Header } from "@/components/dashboard/header";
import { HeroSection } from "@/components/dashboard/hero-section";
import { AggregateSection } from "@/components/dashboard/aggregate-section";
import { QuarterlySection } from "@/components/dashboard/quarterly-section";
import { DriversSection } from "@/components/dashboard/drivers-section";
import { MetroGrid } from "@/components/dashboard/metro-grid";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero — big national score, full viewport */}
      <HeroSection summary={NATIONAL_SUMMARY} />

      {/* Aggregate US section — national trend + sentiment gap + signal highlights */}
      <AggregateSection metros={METROS} summary={NATIONAL_SUMMARY} />

      {/* Quarterly Benchmarks — QoQ comparison cards */}
      <QuarterlySection quarterly={NATIONAL_QUARTERLY} />

      {/* Sentiment Drivers — what's pulling the index up or down */}
      <DriversSection drivers={NATIONAL_DRIVERS} />

      {/* Metro Rankings — sleek table with sparklines */}
      <MetroGrid metros={METROS} />

      {/* Footer */}
      <footer className="relative border-t border-white/[0.04] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="text-sm font-semibold text-foreground mb-1 font-[family-name:var(--font-playfair)] italic">Undercurrent</div>
              <div className="text-xs text-muted-foreground">
                Behavioral economic intelligence for 20 US metros. Updated weekly.
              </div>
            </div>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400/60" />
                All signals operational
              </span>
              <span>4 sources: Google Trends + BLS + FRED + Redfin</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
