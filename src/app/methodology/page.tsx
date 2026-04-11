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
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Overview
        </Link>

        <h1 className="text-3xl font-bold text-foreground tracking-tight mb-6">
          Methodology
        </h1>

        <div className="prose prose-invert prose-zinc max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              What is the Vibe-cession Index?
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              The Vibe-cession Index is a composite behavioral economic indicator
              that tracks how people actually experience the economy at the metro
              level. Traditional indicators like GDP, unemployment rate, and CPI
              are lagging, nationally aggregated, and survey-based. Our index
              uses high-frequency behavioral signals — what people search for,
              whether businesses are opening or closing, what rents are doing in
              real-time — to create a more timely, localized picture of economic
              reality.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              Component Signals
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The index composites 8 signals into a single score per metro, updated weekly.
              Each signal is weighted based on its predictive value and relevance.
            </p>
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-foreground font-medium">Signal</th>
                    <th className="text-right px-4 py-3 text-foreground font-medium">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((key) => (
                    <tr key={key} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-3">
                        <div className="text-foreground">{SIGNAL_LABELS[key]}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {SIGNAL_DESCRIPTIONS[key]}
                        </div>
                      </td>
                      <td className="text-right px-4 py-3 font-mono text-foreground">
                        {Math.round(SIGNAL_WEIGHTS[key] * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              Normalization
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Each signal is converted to a Z-score relative to its own
              metro&apos;s 2-year history. This allows cross-metro comparison — a
              Z-score of -1.5 in San Francisco means SF is 1.5 standard deviations
              below its own normal, regardless of absolute levels. The weighted
              composite is rescaled to 0-100 for readability.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              The Vibes Gap
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We separately compute an &ldquo;Official Index&rdquo; from government
              data (LAUS unemployment, CPI). The difference between the Behavioral
              Index and the Official Index is the <strong className="text-foreground">Vibes Gap</strong>.
              When the gap is large and negative, people feel worse than official
              data suggests. When positive, there&apos;s hidden economic strength
              the official data hasn&apos;t captured yet.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              Data Sources
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              All primary data sources for the MVP are free or scrapeable from public sources.
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-violet-400 mt-1.5 text-xs">&#9679;</span>
                <span><strong className="text-foreground">Google Trends</strong> — Free API, metro-level (DMA), weekly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400 mt-1.5 text-xs">&#9679;</span>
                <span><strong className="text-foreground">Redfin Data Center</strong> — Free, metro-level, weekly housing data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400 mt-1.5 text-xs">&#9679;</span>
                <span><strong className="text-foreground">BLS LAUS</strong> — Free API, ~430 metro areas, monthly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400 mt-1.5 text-xs">&#9679;</span>
                <span><strong className="text-foreground">Dept. of Labor</strong> — Weekly unemployment claims, state-level</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400 mt-1.5 text-xs">&#9679;</span>
                <span><strong className="text-foreground">Indeed Hiring Lab</strong> — Free, metro-level job posting trends</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400 mt-1.5 text-xs">&#9679;</span>
                <span><strong className="text-foreground">Yelp / Google Places</strong> — Business openings and closings</span>
              </li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
