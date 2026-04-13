import { METROS, NATIONAL_SUMMARY, NOWCAST_CHANNELS, GENERATED_AT } from "@/lib/load-data";
import { loadDashboard } from "@/lib/dashboard-data";
import { Header } from "@/components/dashboard/header";
import { IndexHero } from "@/components/index/hero";
import { EconomicDashboard } from "@/components/index/dashboard";
import { ChannelBreakdown } from "@/components/index/channel-breakdown";
import { MetroList } from "@/components/index/metro-list";

const DASHBOARD = loadDashboard();

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-20">
        {/* Hero — national score */}
        <IndexHero summary={NATIONAL_SUMMARY} />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8"><div className="h-px bg-zinc-100" /></div>

        {/* Economic Dashboard — real numbers, sparklines */}
        <EconomicDashboard domains={DASHBOARD} />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8"><div className="h-px bg-zinc-100" /></div>

        {/* Nowcast Channels — alt-data estimates of official readings */}
        <ChannelBreakdown channels={NOWCAST_CHANNELS} />

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
