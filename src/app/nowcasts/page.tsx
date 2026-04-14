import { NOWCAST_CHANNELS } from "@/lib/load-data";
import { Header } from "@/components/dashboard/header";
import { NowcastGrid } from "@/components/nowcasts/nowcast-grid";

export default function NowcastsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-20">
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Nowcast Models</h1>
          <p className="text-sm text-muted-foreground max-w-2xl mb-2">
            Each model predicts the next official economic reading before it&apos;s released,
            using autoregressive momentum plus real-time behavioral and market signals.
          </p>
          <p className="text-xs text-muted-foreground max-w-2xl mb-10">
            AR(3) = last 3 official readings. Alt-signals = weekly metro-level behavioral data.
            Market features = national financial indicators. Ridge regression prevents overfitting.
            R&sup2; is in-sample fit on all available history.
          </p>

          <NowcastGrid channels={NOWCAST_CHANNELS} />
        </section>
      </main>
    </div>
  );
}
