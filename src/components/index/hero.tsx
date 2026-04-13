import { NationalSummary } from "@/lib/types";
import { scoreColor, scoreLabel } from "@/lib/colors";

export function IndexHero({ summary }: { summary: NationalSummary }) {
  const color = scoreColor(summary.averageScore);

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8">
        {/* Left: title + description */}
        <div className="max-w-lg">
          <h1 className="font-[family-name:var(--font-playfair)] italic text-4xl sm:text-5xl text-foreground tracking-tight mb-3">
            Undercurrent
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            A behavioral economic index measuring how Americans actually experience the
            economy — across 50 metros, powered by search data, housing markets, business
            formation, and financial conditions.
          </p>
        </div>

        {/* Right: the score */}
        <div className="text-left sm:text-right">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-1">
            National composite
          </div>
          <div className="text-6xl sm:text-7xl font-mono font-black tabular-nums tracking-tighter" style={{ color }}>
            {summary.averageScore}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {scoreLabel(summary.averageScore)} &middot; Gap {summary.averageVibesGap > 0 ? "+" : ""}{summary.averageVibesGap.toFixed(1)}
          </div>
        </div>
      </div>
    </section>
  );
}
