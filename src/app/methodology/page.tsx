import { Header } from "@/components/dashboard/header";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const CHANNELS = [
  { name: "Labor Demand", weight: 25, signals: "New business applications, initial claims, unemployment rate", desc: "Employment is the primary determinant of economic welfare. Business formation and claims move before official payroll data." },
  { name: "Cost of Living", weight: 25, signals: "Housing inventory, price drops, days on market, search anxiety", desc: "Welfare depends on income relative to costs. Housing pressure and search behavior reveal affordability stress." },
  { name: "Consumer Confidence", weight: 20, signals: "Search anxiety ratio, AI job search, savings rate, vehicle sales", desc: "How people feel drives spending decisions, which drives the economy. Search behavior is the purest sentiment signal." },
  { name: "Financial Stress", weight: 15, signals: "NFCI, high yield spread, mortgage rate, revolving credit", desc: "Credit access determines whether households can smooth consumption through shocks." },
  { name: "Housing Market", weight: 15, signals: "Inventory, days on market, price drops, business formation", desc: "Housing is both the largest asset and the largest expense for most families." },
];

const OFFICIAL = [
  { name: "Unemployment Rate", weight: 30, source: "BLS LAUS" },
  { name: "Initial Claims", weight: 20, source: "FRED" },
  { name: "CPI Inflation", weight: 20, source: "BLS CPI" },
  { name: "New Business Applications", weight: 15, source: "FRED" },
  { name: "GDP Growth", weight: 15, source: "FRED" },
];

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20 pb-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" /> Index
          </Link>

          <h1 className="text-3xl sm:text-4xl tracking-tight text-foreground mb-3">
            <span className="font-[family-name:var(--font-instrument)] italic">Methodology</span>
          </h1>
          <p className="text-muted-foreground mb-16 leading-relaxed">
            How we measure what traditional indicators miss — across 50 metros, 1,500+ series, 5 years of history.
          </p>

          <div className="space-y-14">
            {/* What is it */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">What is Undercurrent?</h2>
              <p className="text-muted-foreground leading-relaxed">
                A composite behavioral economic index that measures how people actually experience the economy at the metro level.
                It composites high-frequency behavioral signals — search patterns, housing market dynamics, business formation,
                financial conditions — into a single 0-100 score per metro. The index is organized around 5 causal channels,
                each capturing a distinct dimension of economic welfare.
              </p>
            </section>

            <div className="h-px bg-zinc-100" />

            {/* 5 Channels */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">The 5 Channels</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Each channel represents a causal pathway through which economic conditions affect people. The composite score is a weighted sum of channel scores.
              </p>
              <div className="space-y-6">
                {CHANNELS.map((ch) => (
                  <div key={ch.name}>
                    <div className="flex items-baseline justify-between mb-1">
                      <h3 className="text-sm font-semibold text-foreground">{ch.name}</h3>
                      <span className="text-xs font-mono text-muted-foreground">{ch.weight}%</span>
                    </div>
                    <div className="relative h-1 bg-zinc-100 rounded-full mb-2">
                      <div className="absolute inset-y-0 left-0 rounded-full bg-indigo-400 opacity-60" style={{ width: `${ch.weight * 4}%` }} />
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{ch.desc}</p>
                    <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Signals:</span> {ch.signals}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="h-px bg-zinc-100" />

            {/* Official Benchmark */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Official Benchmark</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Computed separately from government data. The gap between the behavioral index and the official benchmark is the <strong className="text-foreground">Sentiment Gap</strong> — the difference between lived experience and official measurement.
              </p>
              <div className="space-y-2">
                {OFFICIAL.map((o) => (
                  <div key={o.name} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-foreground">{o.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{o.source}</span>
                      <span className="text-xs font-mono text-muted-foreground w-8 text-right">{o.weight}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="h-px bg-zinc-100" />

            {/* Normalization */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Normalization</h2>
              <p className="text-muted-foreground leading-relaxed">
                Each signal is Z-scored over a 5-year rolling window (260 weeks). The weighted composite is rescaled to 0-100.
                A score of 50 means the metro is at its historical average. Signals with missing data are excluded and remaining weights renormalized.
              </p>
            </section>

            <div className="h-px bg-zinc-100" />

            {/* Data */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Data</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                1,500+ economic time series stored in SQLite, accessible via the AI analyst. All data is from free, public sources.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                {[
                  { label: "Metros", value: "50" },
                  { label: "States", value: "51" },
                  { label: "Series", value: "1,500+" },
                  { label: "Datapoints", value: "240K+" },
                  { label: "Domains", value: "13" },
                  { label: "History", value: "5 years" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div className="text-2xl font-mono font-bold text-foreground">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-1.5">
                {[
                  "Google Trends — metro-level search anxiety + AI job ratio",
                  "BLS — unemployment rates, CPI, QCEW wages",
                  "FRED — 800+ national/state series (macro, labor, housing, markets, commodities)",
                  "Redfin — weekly metro housing (inventory, DOM, price drops)",
                  "Zillow — home values, rent indices",
                  "EIA — energy prices",
                ].map((source) => (
                  <div key={source} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-1 h-1 rounded-full bg-emerald-500 flex-shrink-0" />
                    {source}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
