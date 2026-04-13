import { METROS, NATIONAL_QUARTERLY, NATIONAL_DRIVERS, MACRO_DATA, NATIONAL_CPI, GAS_NATIONAL, EXPANDED_DATA } from "@/lib/load-data";
import leadlagJson from "@/data/leadlag.json";
import { Header } from "@/components/dashboard/header";
import { MacroContext } from "@/components/dashboard/macro-context";
import { QuarterlySection } from "@/components/dashboard/quarterly-section";
import { DriversSection } from "@/components/dashboard/drivers-section";
import { LeadLagSection } from "@/components/dashboard/leadlag-section";
import { AiImpactSection } from "@/components/dashboard/ai-impact-section";
import { HousingSection } from "@/components/dashboard/housing-section";
import { AffordabilitySection } from "@/components/dashboard/affordability-section";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function InsightsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Overview
          </Link>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <h1 className="text-4xl md:text-5xl tracking-tight text-foreground mb-3">
            <span className="font-[family-name:var(--font-instrument)] italic">Deep Insights</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Macro indicators, quarterly benchmarks, sentiment drivers, predictive analysis,
            housing market, affordability, and AI economic impact — all in one place.
          </p>
        </div>

        <div id="macro"><MacroContext macro={MACRO_DATA as Record<string, never>} expanded={EXPANDED_DATA as Record<string, never>} cpi={NATIONAL_CPI as Record<string, never>} gas={GAS_NATIONAL as Record<string, never>} /></div>
        <div id="quarterly"><QuarterlySection quarterly={NATIONAL_QUARTERLY} /></div>
        <div id="drivers"><DriversSection drivers={NATIONAL_DRIVERS} /></div>
        <div id="predictive">
          <LeadLagSection
            national={leadlagJson.national}
            signalPairs={leadlagJson.signalPairs ?? []}
            signalSummary={leadlagJson.signalSummary ?? { totalPairsTested: 0, significantLeading: 0, significantLagging: 0, topLeadingPair: null }}
            summary={leadlagJson.summary}
            metros={leadlagJson.metros}
          />
        </div>
        <div id="housing"><HousingSection metros={METROS} /></div>
        <div id="affordability"><AffordabilitySection metros={METROS} /></div>
        <div id="ai"><AiImpactSection metros={METROS} /></div>
      </main>
    </div>
  );
}
