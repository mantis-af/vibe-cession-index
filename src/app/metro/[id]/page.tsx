import { notFound } from "next/navigation";
import Link from "next/link";
import { METROS, loadFullMetro } from "@/lib/load-data";
import { Header } from "@/components/dashboard/header";
import { MetroCharts } from "./metro-charts";
import { scoreColor, scoreLabel } from "@/lib/colors";
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";

export function generateStaticParams() {
  return METROS.map((m) => ({ id: m.id }));
}

export default async function MetroPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const metro = loadFullMetro(id);
  if (!metro) notFound();

  const sorted = [...METROS].sort((a, b) => b.currentScore - a.currentScore);
  const rank = sorted.findIndex((m) => m.id === id) + 1;
  const color = scoreColor(metro.currentScore);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-20 pb-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back */}
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" />
            Index
          </Link>

          {/* Hero */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono text-muted-foreground">#{rank} of {METROS.length}</span>
                <span className="text-xs text-muted-foreground">&middot;</span>
                <span className="text-xs text-muted-foreground">{(metro.population / 1_000_000).toFixed(1)}M pop</span>
                <span className="text-xs text-muted-foreground">&middot;</span>
                <span className={`text-xs flex items-center gap-0.5 ${metro.trend === "improving" ? "text-emerald-600" : metro.trend === "declining" ? "text-red-600" : "text-zinc-500"}`}>
                  {metro.trend === "improving" ? <TrendingUp className="h-3 w-3" /> : metro.trend === "declining" ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                  {metro.trend}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                {metro.name}<span className="text-muted-foreground font-normal">, {metro.state}</span>
              </h1>
            </div>

            {/* Score */}
            <div className="flex items-end gap-8">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-1">Score</div>
                <div className="text-5xl sm:text-6xl font-mono font-black tabular-nums tracking-tighter leading-none" style={{ color }}>
                  {metro.currentScore}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{scoreLabel(metro.currentScore)}</div>
              </div>
              <div className="pb-1">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-1">Gap</div>
                <div className={`text-2xl font-mono font-bold ${metro.vibesGap >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {metro.vibesGap > 0 ? "+" : ""}{metro.vibesGap}
                </div>
              </div>
              <div className="pb-1">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-1">WoW</div>
                <div className={`text-2xl font-mono font-bold ${metro.weekOverWeekChange > 0 ? "text-emerald-600" : metro.weekOverWeekChange < 0 ? "text-red-600" : "text-zinc-500"}`}>
                  {metro.weekOverWeekChange > 0 ? "+" : ""}{metro.weekOverWeekChange}
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-zinc-100 mb-10" />

          {/* Charts */}
          <MetroCharts metro={metro} />

          {/* CTA to agent */}
          <div className="mt-12 pt-8 border-t border-zinc-100">
            <Link
              href={`/analyze`}
              className="flex items-center justify-between p-4 -mx-4 rounded-lg hover:bg-zinc-50 transition-colors group"
            >
              <div>
                <div className="text-sm font-medium text-foreground group-hover:text-indigo-600 transition-colors">
                  Analyze {metro.name} deeper
                </div>
                <div className="text-xs text-muted-foreground">
                  Ask the AI analyst about housing, labor, affordability, or any of 1,500+ economic series
                </div>
              </div>
              <ArrowLeft className="h-4 w-4 text-zinc-300 group-hover:text-indigo-400 rotate-180 transition-colors" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
