"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Search, X, Plus, BarChart3, Database, Filter } from "lucide-react";

interface SeriesInfo {
  id: string;
  name: string;
  category: string;
  scope: string;
  metro?: string;
  metroName?: string;
  unit: string;
  frequency: string;
  source: string;
  pointCount: number;
}

interface DataPoint {
  date: string;
  value: number;
}

const CHART_COLORS = [
  "#6366f1", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#a855f7",
];

const CATEGORIES = ["All", "Index", "Signals", "Macro", "Markets", "Housing", "Prices", "Labor", "Consumer"];
const SCOPES = ["All", "National", "Metro", "Regional"];

interface Props {
  index: SeriesInfo[];
  seriesData: Record<string, DataPoint[]>;
  totalSeries: number;
}

export function ExploreClient({ index, seriesData, totalSeries }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [scope, setScope] = useState("All");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Get unique metros for metro filter
  const metros = useMemo(() => {
    const m = new Map<string, string>();
    index.forEach((s) => {
      if (s.metro && s.metroName) m.set(s.metro, s.metroName);
    });
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [index]);

  const [metroFilter, setMetroFilter] = useState("");

  // Filter series
  const filtered = useMemo(() => {
    return index.filter((s) => {
      if (category !== "All" && s.category !== category) return false;
      if (scope === "National" && s.scope !== "national") return false;
      if (scope === "Metro" && s.scope !== "metro") return false;
      if (scope === "Regional" && s.scope !== "regional") return false;
      if (metroFilter && s.metro !== metroFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || s.source.toLowerCase().includes(q);
      }
      return true;
    });
  }, [index, query, category, scope, metroFilter]);

  // Build chart data from selected series
  const chartData = useMemo(() => {
    if (selectedIds.length === 0) return [];
    const dateMap = new Map<string, Record<string, number>>();
    selectedIds.forEach((id) => {
      const points = seriesData[id] || [];
      points.forEach((p) => {
        if (!dateMap.has(p.date)) dateMap.set(p.date, {});
        dateMap.get(p.date)![id] = p.value;
      });
    });
    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({ date: formatDate(date), rawDate: date, ...values }));
  }, [selectedIds, seriesData]);

  // Assign series to left or right Y-axis based on value magnitude
  const axisAssignment = useMemo(() => {
    if (selectedIds.length <= 1) return { left: selectedIds, right: [] as string[] };

    // Compute the typical magnitude of each series
    const magnitudes: { id: string; mag: number; min: number; max: number }[] = selectedIds.map((id) => {
      const pts = seriesData[id] || [];
      const vals = pts.map((p) => p.value).filter((v) => v !== null && v !== undefined);
      if (vals.length === 0) return { id, mag: 0, min: 0, max: 0 };
      const mn = Math.min(...vals);
      const mx = Math.max(...vals);
      return { id, mag: Math.max(Math.abs(mn), Math.abs(mx)), min: mn, max: mx };
    });

    // If all series have similar magnitude (within 10x), use single axis
    const mags = magnitudes.map((m) => m.mag).filter((m) => m > 0);
    if (mags.length <= 1) return { left: selectedIds, right: [] as string[] };

    const maxMag = Math.max(...mags);
    const minMag = Math.min(...mags);
    if (maxMag / Math.max(minMag, 0.001) < 10) return { left: selectedIds, right: [] as string[] };

    // Split into two groups: large magnitude vs small magnitude
    const threshold = Math.sqrt(maxMag * minMag); // geometric mean
    const left = magnitudes.filter((m) => m.mag >= threshold).map((m) => m.id);
    const right = magnitudes.filter((m) => m.mag < threshold).map((m) => m.id);

    // Make sure both groups have at least one series
    if (left.length === 0) return { left: selectedIds, right: [] as string[] };
    if (right.length === 0) return { left: selectedIds, right: [] as string[] };

    return { left, right };
  }, [selectedIds, seriesData]);

  const selectedSeries = selectedIds.map((id) => index.find((s) => s.id === id)).filter(Boolean) as SeriesInfo[];

  function toggleSeries(id: string) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else if (selectedIds.length < 10) {
      setSelectedIds([...selectedIds, id]);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl md:text-5xl tracking-tight text-foreground mb-2">
          <span className="font-[family-name:var(--font-instrument)] italic">Data Explorer</span>
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Search and chart {totalSeries} economic time series across 50 metros. Select up to 10 series to overlay.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel: search + filters + series list */}
        <div className="lg:col-span-1 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search series..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
            />
          </div>

          {/* Filter toggles */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Filter className="h-3.5 w-3.5" />
            {showFilters ? "Hide" : "Show"} filters
            {(category !== "All" || scope !== "All" || metroFilter) && (
              <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full text-[10px]">active</span>
            )}
          </button>

          {showFilters && (
            <div className="space-y-3 p-3 bg-zinc-50 rounded-xl">
              {/* Category */}
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Category</div>
                <div className="flex flex-wrap gap-1">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      className={`px-2 py-1 text-xs rounded-lg transition-all ${
                        category === c ? "bg-indigo-50 text-indigo-700 font-medium" : "text-muted-foreground hover:bg-zinc-100"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              {/* Scope */}
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Scope</div>
                <div className="flex flex-wrap gap-1">
                  {SCOPES.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setScope(s); if (s !== "Metro") setMetroFilter(""); }}
                      className={`px-2 py-1 text-xs rounded-lg transition-all ${
                        scope === s ? "bg-indigo-50 text-indigo-700 font-medium" : "text-muted-foreground hover:bg-zinc-100"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {/* Metro picker */}
              {scope === "Metro" && (
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Metro</div>
                  <select
                    value={metroFilter}
                    onChange={(e) => setMetroFilter(e.target.value)}
                    className="w-full py-1.5 px-2 text-xs bg-white border border-zinc-200 rounded-lg"
                  >
                    <option value="">All metros</option>
                    {metros.map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Results count */}
          <div className="text-xs text-muted-foreground">
            {filtered.length} of {index.length} series
          </div>

          {/* Series list */}
          <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
            {filtered.slice(0, 100).map((s) => {
              const isSelected = selectedIds.includes(s.id);
              const colorIdx = selectedIds.indexOf(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleSeries(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    isSelected
                      ? "bg-indigo-50 border border-indigo-200"
                      : "hover:bg-zinc-50 border border-transparent"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {isSelected ? (
                      <span className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: CHART_COLORS[colorIdx % CHART_COLORS.length] }} />
                    ) : (
                      <Plus className="h-3.5 w-3.5 text-zinc-300 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-foreground font-medium truncate text-xs">{s.name}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span>{s.source}</span>
                        <span>&middot;</span>
                        <span>{s.frequency}</span>
                        <span>&middot;</span>
                        <span>{s.pointCount} pts</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
            {filtered.length > 100 && (
              <div className="text-xs text-muted-foreground text-center py-2">
                Showing first 100 of {filtered.length}. Narrow your search.
              </div>
            )}
            {filtered.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-8">
                No series match your search.
              </div>
            )}
          </div>
        </div>

        {/* Right panel: chart + selected series */}
        <div className="lg:col-span-2 space-y-4">
          {/* Selected series tags */}
          {selectedSeries.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedSeries.map((s, i) => {
                const isRight = axisAssignment.right.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleSeries(s.id)}
                    className="flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-lg border border-zinc-200 text-xs hover:border-red-300 transition-all group"
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="truncate max-w-[200px]">{s.name}</span>
                    {isRight && <span className="text-[9px] text-muted-foreground bg-zinc-100 px-1 rounded">R</span>}
                    <X className="h-3 w-3 text-zinc-400 group-hover:text-red-500" />
                  </button>
                );
              })}
              {selectedSeries.length > 1 && (
                <button
                  onClick={() => setSelectedIds([])}
                  className="px-2 py-1 text-[10px] text-muted-foreground hover:text-red-600 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          )}

          {/* Chart */}
          <div className="surface rounded-2xl p-5">
            {chartData.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-indigo-500" />
                    <span className="text-sm font-semibold text-foreground">
                      {selectedSeries.length} series selected
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">{chartData.length} data points</span>
                </div>
                {axisAssignment.right.length > 0 && (
                  <div className="flex items-center gap-4 mb-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-[2px] bg-zinc-400 rounded" />
                      Left axis: {axisAssignment.left.map((id) => index.find((s) => s.id === id)?.name?.split(" — ").pop()).join(", ")}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-[2px] bg-zinc-400 rounded" style={{ borderTop: "2px dashed #a1a1aa", background: "transparent" }} />
                      Right axis: {axisAssignment.right.map((id) => index.find((s) => s.id === id)?.name?.split(" — ").pop()).join(", ")}
                    </span>
                  </div>
                )}
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData} margin={{ top: 5, right: axisAssignment.right.length > 0 ? 50 : 10, left: -10, bottom: 0 }}>
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
                    {axisAssignment.right.length > 0 && (
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
                          <div className="bg-white border border-zinc-200 rounded-lg px-3 py-2 shadow-lg text-xs max-w-xs">
                            <div className="text-zinc-500 mb-1">{label}</div>
                            {payload.map((p) => {
                              const info = index.find((s) => s.id === p.dataKey);
                              return (
                                <div key={p.dataKey as string} className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                  <span className="text-zinc-600 truncate">{info?.name?.split(" — ").pop() || p.dataKey as string}:</span>
                                  <span className="font-mono font-semibold text-zinc-900">{typeof p.value === "number" ? p.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : p.value}</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }}
                    />
                    <Legend content={() => null} />
                    {selectedIds.map((id, i) => {
                      const isRight = axisAssignment.right.includes(id);
                      return (
                        <Line
                          key={id}
                          type="monotone"
                          dataKey={id}
                          yAxisId={isRight ? "right" : "left"}
                          stroke={CHART_COLORS[i % CHART_COLORS.length]}
                          strokeWidth={2}
                          strokeDasharray={isRight ? "6 3" : undefined}
                          dot={false}
                          connectNulls
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Database className="h-10 w-10 text-zinc-200 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-1">Select series to chart</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Search for any economic indicator and click to add it to the chart. You can overlay up to 10 series.
                </p>
              </div>
            )}
          </div>

          {/* Selected series details */}
          {selectedSeries.length > 0 && (
            <div className="surface rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Selected Series Details</h3>
              <div className="space-y-2">
                {selectedSeries.map((s, i) => {
                  const points = seriesData[s.id] || [];
                  const latest = points[points.length - 1];
                  const first = points[0];
                  return (
                    <div key={s.id} className="flex items-center gap-3 py-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-foreground font-medium flex-1 truncate">{s.name}</span>
                      <span className="text-muted-foreground">{s.source}</span>
                      <span className="font-mono text-foreground">{latest ? latest.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}</span>
                      <span className="text-muted-foreground">{s.unit}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}
