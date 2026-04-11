import { notFound } from "next/navigation";
import Link from "next/link";
import { METROS } from "@/lib/seed-data";
import { Header } from "@/components/dashboard/header";
import { ScoreBadge } from "@/components/dashboard/score-badge";
import { MetroDetailCharts } from "./metro-detail-charts";
import { scoreColor, changeColor, trendColor, gapColor, gapLabel } from "@/lib/colors";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight, Users } from "lucide-react";

export function generateStaticParams() {
  return METROS.map((m) => ({ id: m.id }));
}

export default async function MetroPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const metro = METROS.find((m) => m.id === id);
  if (!metro) notFound();

  const rank = [...METROS].sort((a, b) => b.currentScore - a.currentScore).findIndex((m) => m.id === id) + 1;
  const latestWeek = metro.history[metro.history.length - 1];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Overview
        </Link>

        {/* Metro Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-foreground tracking-tight">
                {metro.name}, {metro.state}
              </h1>
              <ScoreBadge score={metro.currentScore} size="lg" />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                Pop. {(metro.population / 1_000_000).toFixed(1)}M
              </span>
              <span className="font-mono">Rank #{rank} / 20</span>
              <span className={`flex items-center gap-1 ${trendColor(metro.trend)}`}>
                {metro.trend === "improving" ? <TrendingUp className="h-3.5 w-3.5" /> : metro.trend === "declining" ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                {metro.trend}
              </span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-6">
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Score</div>
              <div className="text-2xl font-mono font-bold" style={{ color: scoreColor(metro.currentScore) }}>
                {metro.currentScore}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">WoW Change</div>
              <div className={`text-2xl font-mono font-bold flex items-center justify-end gap-1 ${changeColor(metro.weekOverWeekChange)}`}>
                {metro.weekOverWeekChange > 0 ? <ArrowUpRight className="h-5 w-5" /> : metro.weekOverWeekChange < 0 ? <ArrowDownRight className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
                {metro.weekOverWeekChange > 0 ? "+" : ""}{metro.weekOverWeekChange}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Vibes Gap</div>
              <div className={`text-2xl font-mono font-bold ${gapColor(metro.vibesGap)}`}>
                {metro.vibesGap > 0 ? "+" : ""}{metro.vibesGap}
              </div>
              <div className="text-[10px] text-muted-foreground">{gapLabel(metro.vibesGap)}</div>
            </div>
          </div>
        </div>

        {/* Charts — client component */}
        <MetroDetailCharts
          history={metro.history}
          signals={metro.currentSignals}
        />
      </main>
    </div>
  );
}
