import { METROS, NATIONAL_SUMMARY } from "@/lib/seed-data";
import { Header } from "@/components/dashboard/header";
import { NationalSummaryBar } from "@/components/dashboard/national-summary-bar";
import { MetroGrid } from "@/components/dashboard/metro-grid";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">
            Vibe-cession Index
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            A real-time behavioral economic index tracking how people{" "}
            <span className="text-foreground font-medium">actually feel</span>{" "}
            about the economy in 20 US metros — powered by search data, job
            postings, housing markets, and consumer behavior. Updated weekly.
          </p>
        </div>

        {/* National Summary Cards */}
        <section className="mb-8">
          <NationalSummaryBar summary={NATIONAL_SUMMARY} />
        </section>

        {/* Metro Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Metro Rankings
            </h2>
            <span className="text-xs text-muted-foreground font-mono">
              Sorted by composite score
            </span>
          </div>
          <MetroGrid metros={METROS} />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <div>
              Vibe-cession Index — Behavioral economic tracking for 20 US metros.
            </div>
            <div className="flex items-center gap-4">
              <span>Data updates weekly</span>
              <span className="text-zinc-600">|</span>
              <span>Seed data — real pipelines coming soon</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
