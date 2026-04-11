import { NationalSummary } from "@/lib/types";
import { scoreColor, gapColor, gapLabel } from "@/lib/colors";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";

export function NationalSummaryBar({ summary }: { summary: NationalSummary }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <SummaryCard
        label="National Average"
        value={summary.averageScore.toString()}
        color={scoreColor(summary.averageScore)}
        sublabel={`Week of ${formatDate(summary.weekOf)}`}
      />
      <SummaryCard
        label="Highest Metro"
        value={summary.highestMetro.score.toString()}
        color={scoreColor(summary.highestMetro.score)}
        sublabel={summary.highestMetro.name}
      />
      <SummaryCard
        label="Lowest Metro"
        value={summary.lowestMetro.score.toString()}
        color={scoreColor(summary.lowestMetro.score)}
        sublabel={summary.lowestMetro.name}
      />
      <SummaryCard
        label="Sentiment Gap"
        value={formatGap(summary.averageVibesGap)}
        color={summary.averageVibesGap >= 0 ? "#22c55e" : "#ef4444"}
        sublabel={gapLabel(summary.averageVibesGap)}
      />
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="text-xs text-muted-foreground mb-2">Trend Distribution</div>
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1 text-green-400">
            <TrendingUp className="h-3.5 w-3.5" />{summary.metrosImproving}
          </span>
          <span className="flex items-center gap-1 text-zinc-400">
            <Minus className="h-3.5 w-3.5" />{summary.metrosStable}
          </span>
          <span className="flex items-center gap-1 text-red-400">
            <TrendingDown className="h-3.5 w-3.5" />{summary.metrosDeclining}
          </span>
        </div>
      </div>
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="text-xs text-muted-foreground mb-2">Metros Tracked</div>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-violet-400" />
          <span className="text-2xl font-mono font-bold text-foreground">20</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">Updated weekly</div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color, sublabel }: {
  label: string; value: string; color: string; sublabel: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="text-xs text-muted-foreground mb-2">{label}</div>
      <div className="text-3xl font-mono font-bold" style={{ color }}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{sublabel}</div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatGap(gap: number): string {
  const sign = gap >= 0 ? "+" : "";
  return `${sign}${gap.toFixed(1)}`;
}
