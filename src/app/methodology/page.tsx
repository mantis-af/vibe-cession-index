import { Header } from "@/components/dashboard/header";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const INDEX_SIGNALS = [
  { name: "Search Anxiety", weight: 18, source: "Google Trends", desc: "Distress vs aspiration search ratio across 5 distress terms and 5 aspiration terms per metro DMA" },
  { name: "New Business Applications", weight: 15, source: "FRED (state-level)", desc: "Weekly new business applications — a direct measure of entrepreneurial confidence" },
  { name: "Unemployment Rate", weight: 12, source: "BLS LAUS", desc: "Metro-level monthly unemployment rate (inverted — lower is better)" },
  { name: "Initial Unemployment Claims", weight: 12, source: "FRED (state-level)", desc: "Weekly initial jobless claims — the earliest signal of labor market stress" },
  { name: "Housing Inventory", weight: 12, source: "Redfin", desc: "Active listings by metro — rising inventory signals buyer hesitation" },
  { name: "Days on Market", weight: 8, source: "Redfin", desc: "Median days homes sit unsold — a leading indicator of market cooling" },
  { name: "Price Drops", weight: 8, source: "Redfin", desc: "Percentage of listings with price reductions — sellers losing confidence" },
  { name: "AI Job Search Ratio", weight: 7, source: "Google Trends", desc: "AI job searches vs traditional job searches — measures labor market transition toward AI" },
];

const OFFICIAL_SIGNALS = [
  { name: "Unemployment Rate", weight: 30, source: "BLS LAUS" },
  { name: "Initial Claims", weight: 20, source: "FRED" },
  { name: "CPI Inflation", weight: 20, source: "BLS CPI Metro" },
  { name: "New Business Applications", weight: 15, source: "FRED" },
  { name: "GDP Growth", weight: 15, source: "FRED" },
];

const DATA_SOURCES = [
  { name: "Google Trends", detail: "Metro-level (DMA), weekly — search anxiety + AI job ratio", active: true },
  { name: "BLS LAUS", detail: "Metro unemployment rates, monthly, ~430 areas", active: true },
  { name: "FRED Initial Claims", detail: "Weekly state-level jobless claims, 5-year history", active: true },
  { name: "FRED Expanded", detail: "17 national series + state biz apps + coincident index", active: true },
  { name: "FRED Macro", detail: "GDP, CPI, consumer sentiment, rates, payrolls (14 series)", active: true },
  { name: "Redfin Data Center", detail: "Weekly metro housing: inventory, DOM, price drops, sales", active: true },
  { name: "Zillow ZHVI", detail: "Monthly median home values by metro (24 months)", active: true },
  { name: "BLS CPI Metro", detail: "Consumer Price Index for 11 metro areas with YoY inflation", active: true },
  { name: "EIA Gas Prices", detail: "Weekly regional gasoline prices via FRED", active: true },
  { name: "AI Impact (Google Trends)", detail: "AI vs traditional job search interest by metro DMA", active: true },
];

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20 pb-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" />
            Back to Overview
          </Link>

          <h1 className="text-4xl md:text-5xl tracking-tight text-foreground mb-4">
            <span className="font-[family-name:var(--font-instrument)] italic">Methodology</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-16 leading-relaxed">
            How we surface what traditional indicators miss — across 50 US metros, 10 data pipelines, 5 years of history.
          </p>

          <div className="space-y-16">
            {/* What is it */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                <span className="text-xs font-mono text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">01</span>
                What is Undercurrent?
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Undercurrent is a composite behavioral economic indicator that surfaces how people
                actually experience the economy at the metro level. It composites 8 high-frequency
                behavioral signals — from Google search patterns to housing market dynamics — into a
                single 0-100 score per metro, updated weekly. The index covers 50 US metros with 5 years
                of weekly history, powered by 10 data pipelines pulling from 40+ economic indicators.
              </p>
            </section>

            <div className="section-divider" />

            {/* Behavioral Index */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                <span className="text-xs font-mono text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">02</span>
                Behavioral Index (8 signals)
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                The behavioral index captures what people are <em>doing</em> — how they search, how the
                housing market moves, how businesses form. These signals update weekly and often lead
                official government data by 2-3 months.
              </p>
              <div className="surface rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200">
                      <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-foreground font-medium">Signal</th>
                      <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-foreground font-medium">Source</th>
                      <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-foreground font-medium">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {INDEX_SIGNALS.map((sig) => (
                      <tr key={sig.name} className="border-b border-zinc-100 last:border-0">
                        <td className="px-5 py-3">
                          <div className="text-foreground font-medium">{sig.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{sig.desc}</div>
                        </td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">{sig.source}</td>
                        <td className="text-right px-5 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-12 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-indigo-400" style={{ width: `${sig.weight * 5}%` }} />
                            </div>
                            <span className="font-mono text-foreground w-8 text-right">{sig.weight}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="section-divider" />

            {/* Official Index */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                <span className="text-xs font-mono text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">03</span>
                Official Index (5 signals)
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                The official index represents what government data says about the economy. It&apos;s
                computed separately and compared against the behavioral index to produce the Sentiment Gap.
              </p>
              <div className="surface rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200">
                      <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-foreground font-medium">Signal</th>
                      <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-foreground font-medium">Source</th>
                      <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-foreground font-medium">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {OFFICIAL_SIGNALS.map((sig) => (
                      <tr key={sig.name} className="border-b border-zinc-100 last:border-0">
                        <td className="px-5 py-3 text-foreground font-medium">{sig.name}</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">{sig.source}</td>
                        <td className="text-right px-5 py-3 font-mono">{sig.weight}%</td>
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
                <span className="text-xs font-mono text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">04</span>
                Normalization
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Each signal is converted to a Z-score relative to its own metro&apos;s 5-year history (260 weeks).
                This allows cross-metro comparison — a Z-score of -1.5 in San Francisco means SF is 1.5
                standard deviations below its own normal, regardless of absolute levels. The weighted
                composite is rescaled to 0-100 for readability. Signals with missing data are excluded
                and remaining weights are renormalized to sum to 1.0.
              </p>
            </section>

            <div className="section-divider" />

            {/* The Sentiment Gap */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                <span className="text-xs font-mono text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">05</span>
                The Sentiment Gap
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The difference between the Behavioral Index and the Official Index is the{" "}
                <strong className="text-foreground">Sentiment Gap</strong>.
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

            {/* Forecast */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                <span className="text-xs font-mono text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">06</span>
                Forecasting
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Validated lead/lag analysis over 5 years shows that behavioral signals predict official
                economic data. We use linear regression on these relationships to project where official
                indicators are heading. Key validated leads (all p&lt;0.05, permutation-tested):
              </p>
              <div className="surface rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200">
                      <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-foreground font-medium">Behavioral Signal</th>
                      <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-foreground font-medium">Predicts</th>
                      <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-foreground font-medium">Lead</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { b: "Housing Inventory", o: "Jobless Claims", lead: "15 weeks" },
                      { b: "Search Anxiety", o: "Unemployment", lead: "15 weeks" },
                      { b: "Days on Market", o: "Unemployment", lead: "14 weeks" },
                      { b: "Search Anxiety", o: "Jobless Claims", lead: "11 weeks" },
                      { b: "Search Anxiety", o: "New Business Apps", lead: "9 weeks" },
                    ].map((row) => (
                      <tr key={`${row.b}-${row.o}`} className="border-b border-zinc-100 last:border-0">
                        <td className="px-5 py-3 text-foreground">{row.b}</td>
                        <td className="px-5 py-3 text-muted-foreground">{row.o}</td>
                        <td className="text-right px-5 py-3 font-mono text-indigo-600">{row.lead}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="section-divider" />

            {/* Data Sources */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
                <span className="text-xs font-mono text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">07</span>
                Data Sources (10 Pipelines)
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                All data sources are free or publicly available. Total data cost: $0.
              </p>
              <div className="space-y-2">
                {DATA_SOURCES.map((source) => (
                  <div key={source.name} className="surface rounded-xl px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
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
