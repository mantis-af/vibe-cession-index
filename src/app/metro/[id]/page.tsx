import { notFound } from "next/navigation";
import Link from "next/link";
import { METROS } from "@/lib/load-data";
import { Header } from "@/components/dashboard/header";
import { MetroDetailClient } from "./metro-detail-client";
import { scoreColor, scoreLabel, gapLabel } from "@/lib/colors";
import { ArrowLeft } from "lucide-react";

export function generateStaticParams() {
  return METROS.map((m) => ({ id: m.id }));
}

export default async function MetroPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const metro = METROS.find((m) => m.id === id);
  if (!metro) notFound();

  const rank = [...METROS].sort((a, b) => b.currentScore - a.currentScore).findIndex((m) => m.id === id) + 1;
  const color = scoreColor(metro.currentScore);

  // Neighboring metros for context
  const sorted = [...METROS].sort((a, b) => b.currentScore - a.currentScore);
  const myIndex = sorted.findIndex((m) => m.id === id);
  const neighbors = sorted
    .filter((_, i) => Math.abs(i - myIndex) <= 2 && i !== myIndex)
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-20 pb-24">
        {/* Breadcrumb */}
        <div className="max-w-7xl mx-auto px-6 lg:px-8 mb-8">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Overview
          </Link>
        </div>

        {/* Metro Hero */}
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 mb-16">
          {/* Background glow */}
          <div className="absolute -top-20 left-1/4 w-[400px] h-[300px] rounded-full blur-[120px] opacity-[0.06]" style={{ backgroundColor: color }} />

          <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-mono text-muted-foreground bg-white/[0.04] border border-white/[0.06] rounded-full px-3 py-1">
                  #{String(rank).padStart(2, "0")} of 20
                </span>
                <span className="text-xs font-mono text-muted-foreground bg-white/[0.04] border border-white/[0.06] rounded-full px-3 py-1">
                  Pop. {(metro.population / 1_000_000).toFixed(1)}M
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-2">
                {metro.name}
                <span className="text-muted-foreground font-normal">, {metro.state}</span>
              </h1>
              <p className="text-muted-foreground max-w-lg">
                Current behavioral index score and signal analysis for the {metro.name} metropolitan area.
              </p>
            </div>

            {/* Score display */}
            <div className="flex items-end gap-8">
              <div className="text-right">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-2">
                  Composite Score
                </div>
                <div className="relative">
                  <div className="absolute inset-0 blur-2xl opacity-20 rounded-full" style={{ backgroundColor: color }} />
                  <div className="relative text-6xl font-mono font-black tabular-nums" style={{ color }}>
                    {metro.currentScore}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{scoreLabel(metro.currentScore)}</div>
              </div>
              <div className="text-right pb-1">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-2">
                  Sentiment Gap
                </div>
                <div className={`text-3xl font-mono font-bold ${metro.vibesGap >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {metro.vibesGap > 0 ? "+" : ""}{metro.vibesGap}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{gapLabel(metro.vibesGap)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts and details — client component */}
        <MetroDetailClient
          metro={metro}
          neighbors={neighbors.map((n) => ({
            id: n.id,
            name: n.name,
            state: n.state,
            score: n.currentScore,
            rank: sorted.findIndex((m) => m.id === n.id) + 1,
          }))}
        />
      </main>
    </div>
  );
}
