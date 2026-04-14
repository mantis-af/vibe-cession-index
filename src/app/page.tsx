import { METROS, NATIONAL_SUMMARY, GENERATED_AT } from "@/lib/load-data";
import { loadDashboard, loadAltSignals } from "@/lib/dashboard-data";
import { Header } from "@/components/dashboard/header";
import { IndexHero } from "@/components/index/hero";
import { EconomicDashboard } from "@/components/index/dashboard";
import { AltSignalPanel } from "@/components/index/alt-signals";
import { MetroList } from "@/components/index/metro-list";

const DASHBOARD = loadDashboard();
const ALT_SIGNALS = loadAltSignals();

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-20">
        {/* Hero — national score */}
        <IndexHero summary={NATIONAL_SUMMARY} />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8"><div className="h-px bg-zinc-100" /></div>

        {/* Economic Dashboard — real numbers, expanded charts */}
        <EconomicDashboard domains={DASHBOARD} />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8"><div className="h-px bg-zinc-100" /></div>

        {/* Alt-data signals — what the real-time behavioral data is showing */}
        <AltSignalPanel signals={ALT_SIGNALS} />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8"><div className="h-px bg-zinc-100" /></div>

        {/* Metro highlights */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24">
          <MetroList metros={METROS} />
        </section>
      </main>

      <footer className="border-t border-zinc-100 py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span className="font-[family-name:var(--font-playfair)] italic text-foreground text-sm">Undercurrent</span>
          <div className="flex items-center gap-4">
            <span>50 metros &middot; 1,500+ series</span>
            {GENERATED_AT && <span>Updated {new Date(GENERATED_AT).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
          </div>
        </div>
      </footer>
    </div>
  );
}
