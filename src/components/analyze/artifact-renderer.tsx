"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  AreaChart,
  BarChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
type ExternalDataMap = Record<string, Array<{ date: string; value: number }>>;

const DEFAULT_COLORS = ["#6366f1", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];

export interface ChartSpec {
  type: "line" | "area" | "bar";
  title: string;
  subtitle?: string;
  series: Array<{
    id: string;
    label: string;
    axis?: "left" | "right";
    color?: string;
    style?: "solid" | "dashed" | "dotted";
  }>;
  dateRange?: { from?: string; to?: string };
  annotations?: Array<{ date: string; label: string }>;
  insight?: string;
}

export function ArtifactRenderer({ spec, externalData }: { spec: ChartSpec; externalData?: ExternalDataMap }) {
  const { chartData, hasRightAxis } = useMemo(() => {
    const dateMap = new Map<string, Record<string, number>>();
    let hasRight = false;

    for (const s of spec.series) {
      if (s.axis === "right") hasRight = true;
      const points = externalData?.[s.id] || [];
      for (const p of points) {
        if (spec.dateRange?.from && p.date < spec.dateRange.from) continue;
        if (spec.dateRange?.to && p.date > spec.dateRange.to) continue;
        if (!dateMap.has(p.date)) dateMap.set(p.date, {});
        dateMap.get(p.date)![s.id] = p.value;
      }
    }

    const data = Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        date: formatDate(date),
        rawDate: date,
        ...values,
      }));

    return { chartData: data, hasRightAxis: hasRight };
  }, [spec]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No data available for the selected series.
      </div>
    );
  }

  const ChartComponent = spec.type === "area" ? AreaChart : spec.type === "bar" ? BarChart : LineChart;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">{spec.title}</h3>
        {spec.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{spec.subtitle}</p>}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-3 text-xs">
        {spec.series.map((s, i) => (
          <span key={s.id} className="flex items-center gap-1.5">
            <span
              className="w-3 h-[2px] rounded"
              style={{
                backgroundColor: s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
                borderTop: s.style === "dashed" ? "2px dashed" : s.style === "dotted" ? "2px dotted" : undefined,
                background: s.style && s.style !== "solid" ? "transparent" : undefined,
              }}
            />
            <span className="text-muted-foreground">{s.label}</span>
            {s.axis === "right" && <span className="text-[9px] text-zinc-400 bg-zinc-100 px-1 rounded">R</span>}
          </span>
        ))}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent data={chartData} margin={{ top: 5, right: hasRightAxis ? 50 : 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#a1a1aa", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "#e4e4e7" }}
              interval={Math.max(0, Math.floor(chartData.length / 10) - 1)}
              angle={-30}
              dy={8}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: "#a1a1aa", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "#e4e4e7" }}
            />
            {hasRightAxis && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: "#a1a1aa", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "#d4d4d8" }}
              />
            )}
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-white border border-zinc-200 rounded-lg px-3 py-2 shadow-lg text-xs">
                    <div className="text-zinc-500 mb-1">{label}</div>
                    {payload.map((p) => {
                      const s = spec.series.find((s) => s.id === p.dataKey);
                      return (
                        <div key={p.dataKey as string} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="text-zinc-600">{s?.label || p.dataKey as string}:</span>
                          <span className="font-mono font-semibold text-zinc-900">
                            {typeof p.value === "number" ? p.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : p.value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              }}
            />
            {spec.annotations?.map((ann) => (
              <ReferenceLine
                key={ann.date}
                x={formatDate(ann.date)}
                stroke="#a1a1aa"
                strokeDasharray="4 4"
                label={{ value: ann.label, fill: "#71717a", fontSize: 10 }}
              />
            ))}
            {spec.series.map((s, i) => {
              const color = s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
              const yAxisId = s.axis === "right" ? "right" : "left";
              const dash = s.style === "dashed" ? "6 3" : s.style === "dotted" ? "2 2" : undefined;

              if (spec.type === "area") {
                return (
                  <Area
                    key={s.id}
                    type="monotone"
                    dataKey={s.id}
                    yAxisId={yAxisId}
                    stroke={color}
                    strokeWidth={2}
                    fill={color}
                    fillOpacity={0.1}
                    strokeDasharray={dash}
                    dot={false}
                    connectNulls
                  />
                );
              }
              if (spec.type === "bar") {
                return (
                  <Bar
                    key={s.id}
                    dataKey={s.id}
                    yAxisId={yAxisId}
                    fill={color}
                    fillOpacity={0.7}
                    radius={[2, 2, 0, 0]}
                  />
                );
              }
              return (
                <Line
                  key={s.id}
                  type="monotone"
                  dataKey={s.id}
                  yAxisId={yAxisId}
                  stroke={color}
                  strokeWidth={2}
                  strokeDasharray={dash}
                  dot={false}
                  connectNulls
                />
              );
            })}
          </ChartComponent>
        </ResponsiveContainer>
      </div>

      {/* Insight */}
      {spec.insight && (
        <div className="mt-4 pt-3 border-t border-zinc-100">
          <p className="text-sm text-foreground/80 leading-relaxed">{spec.insight}</p>
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}
