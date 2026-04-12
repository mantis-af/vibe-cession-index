"use client";

import { ArtifactRenderer, type ChartSpec } from "./artifact-renderer";

export interface DashboardSpec {
  title: string;
  subtitle?: string;
  layout?: "2col" | "3col" | "1col" | "2x2";
  charts: ChartSpec[];
  insight?: string;
}

const LAYOUT_CLASSES: Record<string, string> = {
  "1col": "grid-cols-1",
  "2col": "grid-cols-1 lg:grid-cols-2",
  "3col": "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  "2x2": "grid-cols-1 lg:grid-cols-2",
};

type ExternalDataMap = Record<string, Array<{ date: string; value: number }>>;

export function DashboardRenderer({ spec, externalData }: { spec: DashboardSpec; externalData?: ExternalDataMap }) {
  const layout = spec.layout || "2col";
  const gridClass = LAYOUT_CLASSES[layout] || LAYOUT_CLASSES["2col"];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">{spec.title}</h3>
        {spec.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{spec.subtitle}</p>}
      </div>

      {/* Chart grid */}
      <div className={`grid ${gridClass} gap-4 flex-1 min-h-0`}>
        {spec.charts.map((chart, i) => (
          <div key={i} className="border border-zinc-100 rounded-xl p-4 min-h-[280px] flex flex-col">
            <ArtifactRenderer spec={chart} externalData={externalData} />
          </div>
        ))}
      </div>

      {/* Overall insight */}
      {spec.insight && (
        <div className="mt-4 pt-3 border-t border-zinc-100">
          <p className="text-sm text-foreground/80 leading-relaxed">{spec.insight}</p>
        </div>
      )}
    </div>
  );
}
