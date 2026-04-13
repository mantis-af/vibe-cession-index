"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
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
import { Search, X, Plus, BarChart3, Database, Filter, ChevronDown } from "lucide-react";

interface SeriesInfo {
  id: string;
  name: string;
  category: string;
  scope: string;
  metro?: string | null;
  metro_name?: string | null;
  state?: string | null;
  unit: string;
  frequency: string;
  source_id: string;
  point_count: number;
  primary_tag?: string | null;
  domain?: string | null;
}

interface DataPoint {
  date: string;
  value: number;
}

const CHART_COLORS = [
  "#6366f1", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#a855f7",
];

const DOMAIN_LABELS: Record<string, string> = {
  labor: "Labor Market",
  housing: "Housing",
  prices: "Prices & Inflation",
  markets: "Financial Markets",
  consumer: "Consumer",
  production: "Production",
  trade: "Trade",
  fiscal: "Government",
  monetary: "Monetary Policy",
  energy: "Energy",
  business: "Business",
  index: "Undercurrent Index",
  demographics: "Demographics",
};

interface Props {
  totalSeries: number;
  domains: Record<string, Array<{ category: string; label: string; count: number }>>;
}

export function ExploreClient({ totalSeries, domains }: Props) {
  const [query, setQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [scopeFilter, setScopeFilter] = useState("");
  const [results, setResults] = useState<SeriesInfo[]>([]);
  const [resultTotal, setResultTotal] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [seriesData, setSeriesData] = useState<Record<string, DataPoint[]>>({});
  const [showFilters, setShowFilters] = useState(false);

  // Debounced search
  const doSearch = useCallback(async (q: string, domain: string, scope: string) => {
    setIsSearching(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (domain) params.set("domain", domain);
    if (scope) params.set("scope", scope);
    params.set("limit", "60");

    try {
      const res = await fetch(`/api/series/search?${params}`);
      const data = await res.json();
      setResults(data.series || []);
      setResultTotal(data.total || 0);
    } catch {
      setResults([]);
      setResultTotal(0);
    }
    setIsSearching(false);
  }, []);

  // Search on filter change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      doSearch(query, domainFilter, scopeFilter);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, domainFilter, scopeFilter, doSearch]);

  // Fetch series data when selected
  async function fetchSeriesData(id: string) {
    if (seriesData[id]) return; // already have it
    try {
      const res = await fetch(`/api/series/${id}/data`);
      const data = await res.json();
      if (data.points) {
        setSeriesData((prev) => ({ ...prev, [id]: data.points }));
      }
    } catch { /* ignore */ }
  }

  function toggleSeries(id: string) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else if (selectedIds.length < 10) {
      setSelectedIds([...selectedIds, id]);
      fetchSeriesData(id);
    }
  }

  // Build chart data
  const chartData = useMemo(() => {
    if (selectedIds.length === 0) return [];
    const dateMap = new Map<string, Record<string, number>>();
    for (const id of selectedIds) {
      const points = seriesData[id] || [];
      for (const p of points) {
        if (!dateMap.has(p.date)) dateMap.set(p.date, {});
        dateMap.get(p.date)![id] = p.value;
      }
    }
    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({ date: formatDate(date), rawDate: date, ...values }));
  }, [selectedIds, seriesData]);

  // Dual axis detection
  const axisAssignment = useMemo(() => {
    if (selectedIds.length <= 1) return { left: selectedIds, right: [] as string[] };
    const magnitudes = selectedIds.map((id) => {
      const pts = seriesData[id] || [];
      const vals = pts.map((p) => p.value);
      if (!vals.length) return { id, mag: 0 };
      return { id, mag: Math.max(Math.abs(Math.min(...vals)), Math.abs(Math.max(...vals))) };
    });
    const mags = magnitudes.map((m) => m.mag).filter((m) => m > 0);
    if (mags.length <= 1 || Math.max(...mags) / Math.max(Math.min(...mags), 0.001) < 10) {
      return { left: selectedIds, right: [] as string[] };
    }
    const threshold = Math.sqrt(Math.max(...mags) * Math.min(...mags));
    const left = magnitudes.filter((m) => m.mag >= threshold).map((m) => m.id);
    const right = magnitudes.filter((m) => m.mag < threshold).map((m) => m.id);
    if (!left.length || !right.length) return { left: selectedIds, right: [] as string[] };
    return { left, right };
  }, [selectedIds, seriesData]);

  const selectedSeries = selectedIds.map((id) => results.find((s) => s.id === id) || { id, name: id, source_id: "", frequency: "", point_count: 0 } as SeriesInfo);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl md:text-5xl tracking-tight text-foreground mb-2">
          <span className="font-[family-name:var(--font-instrument)] italic">Data Explorer</span>
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Search and chart {totalSeries.toLocaleString()} economic time series across 50 metros, 51 states, and 12 international economies.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel */}
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

          {/* Filters toggle */}
          <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Filter className="h-3.5 w-3.5" />
            {showFilters ? "Hide" : "Show"} filters
            {(domainFilter || scopeFilter) && <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full text-[10px]">active</span>}
          </button>

          {showFilters && (
            <div className="space-y-3 p-3 bg-zinc-50 rounded-xl">
              {/* Domain */}
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Domain</div>
                <div className="flex flex-wrap gap-1">
                  <button onClick={() => setDomainFilter("")} className={`px-2 py-1 text-xs rounded-lg transition-all ${!domainFilter ? "bg-indigo-50 text-indigo-700 font-medium" : "text-muted-foreground hover:bg-zinc-100"}`}>All</button>
                  {Object.entries(domains).map(([key, cats]) => (
                    <button key={key} onClick={() => setDomainFilter(key)} className={`px-2 py-1 text-xs rounded-lg transition-all ${domainFilter === key ? "bg-indigo-50 text-indigo-700 font-medium" : "text-muted-foreground hover:bg-zinc-100"}`}>
                      {DOMAIN_LABELS[key] || key} <span className="text-[9px] opacity-60">({cats.reduce((s, c) => s + c.count, 0)})</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Scope */}
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Scope</div>
                <div className="flex flex-wrap gap-1">
                  {["", "national", "state", "metro", "international"].map((s) => (
                    <button key={s} onClick={() => setScopeFilter(s)} className={`px-2 py-1 text-xs rounded-lg transition-all ${scopeFilter === s ? "bg-indigo-50 text-indigo-700 font-medium" : "text-muted-foreground hover:bg-zinc-100"}`}>
                      {s || "All"}
                    </button>
                  ))}
                </div>
              </div>
              {/* Domain categories */}
              {domainFilter && domains[domainFilter] && (
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Categories in {DOMAIN_LABELS[domainFilter] || domainFilter}</div>
                  <div className="space-y-0.5">
                    {domains[domainFilter].map((cat) => (
                      <div key={cat.category} className="text-xs text-muted-foreground flex justify-between px-1">
                        <span>{cat.category.replace(/-/g, " ")}</span>
                        <span className="font-mono">{cat.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results */}
          <div className="text-xs text-muted-foreground">
            {isSearching ? "Searching..." : `${resultTotal.toLocaleString()} series found`}
          </div>

          <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
            {results.map((s) => {
              const isSelected = selectedIds.includes(s.id);
              const colorIdx = selectedIds.indexOf(s.id);
              return (
                <button key={s.id} onClick={() => toggleSeries(s.id)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isSelected ? "bg-indigo-50 border border-indigo-200" : "hover:bg-zinc-50 border border-transparent"}`}>
                  <div className="flex items-start gap-2">
                    {isSelected ? (
                      <span className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: CHART_COLORS[colorIdx % CHART_COLORS.length] }} />
                    ) : (
                      <Plus className="h-3.5 w-3.5 text-zinc-300 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-foreground font-medium truncate text-xs">{s.name}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span className="bg-zinc-100 px-1 rounded">{s.domain || s.category}</span>
                        <span>{s.frequency}</span>
                        <span>{s.point_count} pts</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
            {results.length === 0 && !isSearching && (
              <div className="text-sm text-muted-foreground text-center py-8">
                {query || domainFilter || scopeFilter ? "No series match your filters." : "Type to search or select a domain."}
              </div>
            )}
          </div>
        </div>

        {/* Right panel: chart */}
        <div className="lg:col-span-2 space-y-4">
          {/* Selected tags */}
          {selectedSeries.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedSeries.map((s, i) => {
                const isRight = axisAssignment.right.includes(s.id);
                return (
                  <button key={s.id} onClick={() => toggleSeries(s.id)} className="flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-lg border border-zinc-200 text-xs hover:border-red-300 transition-all group">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="truncate max-w-[200px]">{s.name}</span>
                    {isRight && <span className="text-[9px] text-muted-foreground bg-zinc-100 px-1 rounded">R</span>}
                    <X className="h-3 w-3 text-zinc-400 group-hover:text-red-500" />
                  </button>
                );
              })}
              {selectedSeries.length > 1 && (
                <button onClick={() => setSelectedIds([])} className="px-2 py-1 text-[10px] text-muted-foreground hover:text-red-600 transition-colors">Clear all</button>
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
                    <span className="text-sm font-semibold text-foreground">{selectedSeries.length} series</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">{chartData.length} data points</span>
                </div>
                {axisAssignment.right.length > 0 && (
                  <div className="flex items-center gap-4 mb-2 text-[10px] text-muted-foreground">
                    <span>Left axis: solid lines</span>
                    <span>Right axis: dashed lines</span>
                  </div>
                )}
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData} margin={{ top: 5, right: axisAssignment.right.length > 0 ? 50 : 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#e4e4e7" }} interval={Math.max(0, Math.floor(chartData.length / 10) - 1)} angle={-30} dy={8} />
                    <YAxis yAxisId="left" tick={{ fill: "#a1a1aa", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#e4e4e7" }} />
                    {axisAssignment.right.length > 0 && (
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: "#a1a1aa", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#d4d4d8" }} />
                    )}
                    <Tooltip content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-white border border-zinc-200 rounded-lg px-3 py-2 shadow-lg text-xs max-w-xs">
                          <div className="text-zinc-500 mb-1">{label}</div>
                          {payload.map((p) => {
                            const info = results.find((s) => s.id === p.dataKey);
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
                    }} />
                    <Legend content={() => null} />
                    {selectedIds.map((id, i) => {
                      const isRight = axisAssignment.right.includes(id);
                      return (
                        <Line key={id} type="monotone" dataKey={id} yAxisId={isRight ? "right" : "left"} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} strokeDasharray={isRight ? "6 3" : undefined} dot={false} connectNulls />
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
                  Search {totalSeries.toLocaleString()} economic indicators and click to add them to the chart. Overlay up to 10 series with automatic dual axes.
                </p>
              </div>
            )}
          </div>

          {/* Selected series details */}
          {selectedSeries.length > 0 && selectedSeries[0].point_count > 0 && (
            <div className="surface rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Selected Series</h3>
              <div className="space-y-2">
                {selectedSeries.map((s, i) => {
                  const pts = seriesData[s.id] || [];
                  const latest = pts[pts.length - 1];
                  return (
                    <div key={s.id} className="flex items-center gap-3 py-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-foreground font-medium flex-1 truncate">{s.name}</span>
                      <span className="text-muted-foreground bg-zinc-50 px-1.5 rounded">{s.domain || s.category}</span>
                      <span className="font-mono text-foreground">{latest ? latest.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "loading..."}</span>
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
