import Link from "next/link";
import { Metro } from "@/lib/types";
import { scoreColor, changeColor, trendColor, gapColor, gapLabel } from "@/lib/colors";
import { ScoreBadge } from "./score-badge";
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from "lucide-react";

function TrendIcon({ trend }: { trend: Metro["trend"] }) {
  switch (trend) {
    case "improving": return <TrendingUp className="h-3.5 w-3.5" />;
    case "declining": return <TrendingDown className="h-3.5 w-3.5" />;
    case "stable": return <Minus className="h-3.5 w-3.5" />;
  }
}

function MiniSparkline({ history }: { history: Metro["history"] }) {
  const scores = history.slice(-8).map((h) => h.compositeScore);
  const min = Math.min(...scores) - 2;
  const max = Math.max(...scores) + 2;
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const points = scores.map((s, i) => {
    const x = (i / (scores.length - 1)) * w;
    const y = h - ((s - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");

  const lastScore = scores[scores.length - 1];
  const color = scoreColor(lastScore);

  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
    </svg>
  );
}

export function MetroGrid({ metros }: { metros: Metro[] }) {
  const sorted = [...metros].sort((a, b) => b.currentScore - a.currentScore);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {sorted.map((metro, idx) => (
        <Link
          key={metro.id}
          href={`/metro/${metro.id}`}
          className="group bg-card border border-border rounded-lg p-4 hover:border-violet-500/50 hover:bg-card/80 transition-all duration-200"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">#{idx + 1}</span>
                <h3 className="font-semibold text-foreground group-hover:text-violet-400 transition-colors">
                  {metro.name}
                </h3>
              </div>
              <span className="text-xs text-muted-foreground">{metro.state}</span>
            </div>
            <MiniSparkline history={metro.history} />
          </div>

          <div className="flex items-end justify-between">
            <div className="flex items-center gap-3">
              <div
                className="text-3xl font-mono font-bold"
                style={{ color: scoreColor(metro.currentScore) }}
              >
                {metro.currentScore}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className={`flex items-center gap-0.5 text-xs font-mono ${changeColor(metro.weekOverWeekChange)}`}>
                  {metro.weekOverWeekChange > 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : metro.weekOverWeekChange < 0 ? (
                    <ArrowDownRight className="h-3 w-3" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                  {metro.weekOverWeekChange > 0 ? "+" : ""}{metro.weekOverWeekChange}
                </span>
                <span className={`flex items-center gap-0.5 text-xs ${trendColor(metro.trend)}`}>
                  <TrendIcon trend={metro.trend} />
                  {metro.trend}
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Vibes Gap</div>
              <div className={`text-sm font-mono font-semibold ${gapColor(metro.vibesGap)}`}>
                {metro.vibesGap > 0 ? "+" : ""}{metro.vibesGap}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
