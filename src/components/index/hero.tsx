import { NationalSummary } from "@/lib/types";
import { scoreColor, scoreLabel } from "@/lib/colors";

export function IndexHero({ summary }: { summary: NationalSummary }) {
  const color = scoreColor(summary.averageScore);

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-4">
      {/* Title */}
      <div className="mb-10">
        <h1 className="font-[family-name:var(--font-playfair)] italic text-4xl sm:text-5xl text-foreground tracking-tight mb-3">
          Undercurrent
        </h1>
        <p className="text-muted-foreground leading-relaxed max-w-xl">
          A behavioral economic index measuring how Americans actually experience the
          economy — powered by search data, housing markets, business formation, and
          financial conditions across 50 metros.
        </p>
      </div>

      {/* Score + stats row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 sm:gap-12">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-1">National composite</div>
          <div className="text-7xl sm:text-8xl font-mono font-black tabular-nums tracking-tighter leading-none" style={{ color }}>
            {summary.averageScore}
          </div>
        </div>
        <div className="flex gap-8 text-sm pb-2">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Status</div>
            <div className="font-medium text-foreground">{scoreLabel(summary.averageScore)}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Gap</div>
            <div className={`font-mono font-medium ${summary.averageVibesGap >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {summary.averageVibesGap > 0 ? "+" : ""}{summary.averageVibesGap.toFixed(1)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Improving</div>
            <div className="font-mono font-medium text-foreground">{summary.metrosImproving} of {summary.metrosImproving + summary.metrosDeclining + summary.metrosStable}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
