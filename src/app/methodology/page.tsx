import { Header } from "@/components/dashboard/header";
import { SIGNAL_LABELS, SIGNAL_WEIGHTS, SIGNAL_DESCRIPTIONS } from "@/lib/types";
import type { MetroSignals } from "@/lib/types";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function MethodologyPage() {
  const signals = Object.keys(SIGNAL_LABELS) as Array<keyof MetroSignals>;
  const sorted = [...signals].sort(
    (a, b) => SIGNAL_WEIGHTS[b] - SIGNAL_WEIGHTS[a]
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-20 pb-24">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Overview
          </Link>

          <h1 className="text-4xl md:text-5xl tracking-tight text-foreground mb-4">
            <span className="font-[family-name:var(--font-instrument)] italic">Methodology</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-16 leading-relaxed">
            How we surface what traditional indicators miss.
          </p>

          <div className="space-y-16">
            {/* What is it */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                <span className="text-xs font-mono text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">01</span>
                What is Undercurrent?
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Undercurrent is a composite behavioral economic indicator
                that surfaces how people actually experience the economy at the metro
                level. Traditional indicators like GDP, unemployment rate, and CPI
                are lagging, nationally aggregated, and survey-based. Undercurrent
                uses high-frequency behavioral signals — what people search for,
                whether businesses are opening or closing, what rents are doing in
                real-time — to reveal the economic reality flowing beneath the
                headline numbers.
              </p>
            </section>

            <div className="section-divider" />

            {/* Component Signals */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                <span className="text-xs font-mono text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">02</span>
                Component Signals
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                The index composites 8 behavioral signals into a single score per metro, drawn from 6 data sources and updated weekly. Weights are rebalanced across available signals.
              </p>
              <div className="surface rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200">
                      <th className="text-left px-5 py-3 text-foreground font-medium text-xs uppercase tracking-wider">Signal</th>
                      <th className="text-right px-5 py-3 text-foreground font-medium text-xs uppercase tracking-wider">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((key, i) => (
                      <tr key={key} className="border-b border-zinc-100 last:border-0">
                        <td className="px-5 py-4">
                          <div className="text-foreground font-medium">{SIGNAL_LABELS[key]}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {SIGNAL_DESCRIPTIONS[key]}
                          </div>
                        </td>
                        <td className="text-right px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-indigo-400"
                                style={{ width: `${SIGNAL_WEIGHTS[key] * 500}%` }}
                              />
                            </div>
                            <span className="font-mono text-foreground w-8 text-right">
                              {Math.round(SIGNAL_WEIGHTS[key] * 100)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="section-divider" />

            {/* Normalization */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                <span className="text-xs font-mono text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">03</span>
                Normalization
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Each signal is converted to a Z-score relative to its own
                metro&apos;s 2-year history (104 weeks). This allows cross-metro
                comparison — a Z-score of -1.5 in San Francisco means SF is 1.5
                standard deviations below its own normal, regardless of absolute
                levels. The weighted composite is rescaled to 0-100 for readability.
                Signals with missing data are excluded and remaining weights are
                renormalized to sum to 1.0.
              </p>
            </section>

            <div className="section-divider" />

            {/* The Sentiment Gap */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                <span className="text-xs font-mono text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">04</span>
                The Sentiment Gap
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We separately compute an &ldquo;Official Index&rdquo; from government
                data (LAUS unemployment, CPI). The difference between the Behavioral
                Index and the Official Index is the <strong className="text-foreground">Sentiment Gap</strong>.
              </p>
              <div className="surface rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center py-4">
                  <div className="text-3xl font-mono font-bold text-emerald-600 mb-1">+ Positive</div>
                  <div className="text-sm text-muted-foreground">Hidden economic strength. People feel better than the data suggests.</div>
                </div>
                <div className="text-center py-4">
                  <div className="text-3xl font-mono font-bold text-red-600 mb-1">- Negative</div>
                  <div className="text-sm text-muted-foreground">Sentiment recession. People feel worse than official numbers show.</div>
                </div>
              </div>
            </section>

            <div className="section-divider" />

            {/* Data Sources */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                <span className="text-xs font-mono text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">05</span>
                Data Sources
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                All primary data sources are free or scrapeable from public sources. Total data cost: $0.
              </p>
              <div className="space-y-3">
                {[
                  { name: "Google Trends", detail: "Metro-level (DMA), weekly — distress vs aspiration search ratio", active: true },
                  { name: "BLS LAUS", detail: "~430 metro areas, monthly unemployment rates", active: true },
                  { name: "FRED", detail: "Weekly initial unemployment claims by state via St. Louis Fed", active: true },
                  { name: "Redfin Data Center", detail: "Weekly housing inventory, days on market, price drops", active: true },
                  { name: "Indeed Hiring Lab", detail: "Metro-level job posting velocity (data source currently offline)", active: false },
                  { name: "Census Bureau", detail: "Monthly building permits by metro (API currently unavailable)", active: false },
                ].map((source) => (
                  <div key={source.name} className={`surface rounded-xl px-5 py-3.5 flex items-center justify-between ${!source.active ? "opacity-50" : ""}`}>
                    <div className="flex items-center gap-2.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${source.active ? "bg-emerald-500" : "bg-zinc-300"}`} />
                      <span className="text-sm font-medium text-foreground">{source.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{source.detail}</span>
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
