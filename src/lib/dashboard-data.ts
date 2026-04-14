/**
 * Load real-time economic dashboard data from SQLite.
 * Real numbers, real units, sparklines for trajectory.
 */

import { getDb } from "./db";

export interface DashboardMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  date: string;
  frequency: string;
  change: number | null;       // vs previous reading
  changePct: number | null;    // % change
  direction: "up" | "down" | "flat";
  sparkline: number[];         // last 12 readings for chart
  sparkDates: string[];        // dates for each sparkline point
  domain: string;
}

export interface AltSignalSeries {
  key: string;
  name: string;
  description: string;
  color: string;
  unit: string;
  data: Array<{ date: string; value: number }>;
  latest: number;
  change4w: number | null;     // 4-week change
  direction: "up" | "down" | "flat";
}

export interface DashboardDomain {
  key: string;
  name: string;
  metrics: DashboardMetric[];
}

const DASHBOARD_METRICS = [
  // ─── Jobs ───
  { id: "macro_unemployment_rate_national", name: "Unemployment", unit: "%", domain: "jobs", invert: true },
  { id: "expanded_continued_claims", name: "Continued Claims", unit: "M", divisor: 1_000_000, domain: "jobs", invert: true },
  { id: "expanded_job_openings", name: "Job Openings", unit: "M", divisor: 1000, domain: "jobs" },
  { id: "labor_civpart", name: "Participation Rate", unit: "%", domain: "jobs" },
  { id: "smallbiz_busappwnsaus", name: "New Business Apps", unit: "K", divisor: 1000, domain: "jobs" },
  { id: "expanded_quit_rate", name: "Quit Rate", unit: "%", domain: "jobs" },

  // ─── Prices ───
  { id: "gas_national", name: "Gas Price", unit: "$/gal", domain: "prices", invert: true },
  { id: "expanded_mortgage_30y", name: "30Y Mortgage", unit: "%", domain: "prices", invert: true },
  { id: "consumer_umcsent", name: "Consumer Sentiment", unit: "Index", domain: "prices" },
  { id: "expanded_savings_rate", name: "Savings Rate", unit: "%", domain: "prices" },
  { id: "expanded_vehicle_sales", name: "Vehicle Sales", unit: "M", domain: "prices" },

  // ─── Housing ───
  { id: "expanded_case_shiller", name: "Home Prices", unit: "Index", domain: "housing" },
  { id: "expanded_housing_starts", name: "Housing Starts", unit: "K", domain: "housing" },

  // ─── Markets ───
  { id: "expanded_sp500", name: "S&P 500", unit: "", domain: "markets" },
  { id: "expanded_vix", name: "VIX", unit: "", domain: "markets", invert: true },
  { id: "yield_10y", name: "10Y Treasury", unit: "%", domain: "markets" },
  { id: "bond_bamlh0a0hym2", name: "HY Spread", unit: "%", domain: "markets", invert: true },
  { id: "crypto_cbbtcusd", name: "Bitcoin", unit: "$", domain: "markets" },
  { id: "fin_nfci", name: "Financial Conditions", unit: "Index", domain: "markets", invert: true },
];

const DOMAIN_NAMES: Record<string, string> = {
  jobs: "Labor Market",
  prices: "Consumer & Prices",
  housing: "Housing",
  markets: "Financial Markets",
};

export function loadDashboard(): DashboardDomain[] {
  const d = getDb();
  const byDomain = new Map<string, DashboardMetric[]>();

  for (const def of DASHBOARD_METRICS) {
    const pts = d.prepare("SELECT date, value FROM datapoints WHERE series_id = ? ORDER BY date DESC LIMIT 13")
      .all(def.id) as Array<{ date: string; value: number }>;

    if (pts.length < 2) continue;

    const divisor = (def as { divisor?: number }).divisor ?? 1;
    const latest = pts[0].value / divisor;
    const previous = pts[1].value / divisor;
    const change = latest - previous;
    const changePct = previous !== 0 ? (change / Math.abs(previous)) * 100 : 0;

    // Direction: "up" = good, "down" = bad. Inverted for things where higher = worse
    const invert = (def as { invert?: boolean }).invert ?? false;
    const isPositive = invert ? change < 0 : change > 0;
    const direction = Math.abs(changePct) < 0.1 ? "flat" : isPositive ? "up" : "down";

    // Sparkline: last 12 readings, oldest first
    const sparkSlice = pts.slice(0, 12).reverse();
    const sparkline = sparkSlice.map(p => p.value / divisor);
    const sparkDates = sparkSlice.map(p => {
      const d = p.date.length === 7 ? p.date : p.date.slice(0, 7);
      const [y, m] = d.split("-");
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${months[parseInt(m) - 1]} ${y.slice(2)}`;
    });

    const metric: DashboardMetric = {
      id: def.id,
      name: def.name,
      value: Math.round(latest * 100) / 100,
      unit: def.unit,
      date: pts[0].date,
      frequency: (d.prepare("SELECT frequency FROM series WHERE id = ?").get(def.id) as { frequency: string })?.frequency ?? "monthly",
      change: Math.round(change * 100) / 100,
      changePct: Math.round(changePct * 10) / 10,
      direction,
      sparkline,
      sparkDates,
      domain: def.domain,
    };

    if (!byDomain.has(def.domain)) byDomain.set(def.domain, []);
    byDomain.get(def.domain)!.push(metric);
  }

  const domains: DashboardDomain[] = [];
  for (const [key, name] of Object.entries(DOMAIN_NAMES)) {
    const metrics = byDomain.get(key) ?? [];
    if (metrics.length > 0) {
      domains.push({ key, name, metrics });
    }
  }

  return domains;
}

// ─── Alt-data signals for the index page ───

const ALT_SIGNAL_DEFS = [
  {
    key: "search_anxiety", name: "Search Anxiety Index",
    description: "Google Trends ratio of distress vs aspiration searches across 50 metros",
    sigPattern: "google_trends_anxiety", color: "#ef4444", unit: "z-score",
  },
  {
    key: "initial_claims", name: "Initial Unemployment Claims",
    description: "Weekly first-time unemployment filings averaged across metros",
    sigPattern: "initial_claims", color: "#f59e0b", unit: "z-score",
  },
  {
    key: "housing_inventory", name: "Housing Inventory",
    description: "Active listings on the market — rising inventory signals softening demand",
    sigPattern: "housing_inventory", color: "#8b5cf6", unit: "z-score",
  },
  {
    key: "ai_job_ratio", name: "AI Job Search Ratio",
    description: "AI-related vs traditional job searches — structural labor market shift",
    sigPattern: "ai_job_ratio", color: "#6366f1", unit: "z-score",
  },
  {
    key: "housing_dom", name: "Days on Market",
    description: "How long homes sit before selling — early indicator of housing market health",
    sigPattern: "housing_dom", color: "#22c55e", unit: "z-score",
  },
  {
    key: "price_drops", name: "Price Reductions",
    description: "Share of listings with price cuts — seller desperation signal",
    sigPattern: "housing_price_drops", color: "#ec4899", unit: "z-score",
  },
];

export function loadAltSignals(): AltSignalSeries[] {
  const d = getDb();
  const signals: AltSignalSeries[] = [];

  for (const def of ALT_SIGNAL_DEFS) {
    // Average z-scores across all metros per week
    const rows = d.prepare(`
      SELECT dp.date, AVG(dp.value) as avg_z
      FROM datapoints dp JOIN series s ON dp.series_id = s.id
      WHERE s.id LIKE ? AND s.scope = 'metro'
      GROUP BY dp.date ORDER BY dp.date
    `).all(`metro_%_sig_${def.sigPattern}`) as Array<{ date: string; avg_z: number }>;

    if (rows.length < 10) continue;

    // Last 52 weeks
    const recent = rows.slice(-52);
    const data = recent.map(r => ({
      date: r.date,
      value: Math.round(r.avg_z * 1000) / 1000,
    }));

    const latest = data[data.length - 1]?.value ?? 0;
    const fourWeeksAgo = data.length >= 5 ? data[data.length - 5]?.value ?? 0 : 0;
    const change4w = data.length >= 5 ? Math.round((latest - fourWeeksAgo) * 1000) / 1000 : null;
    const direction = change4w === null ? "flat" as const
      : Math.abs(change4w) < 0.05 ? "flat" as const
      : change4w > 0 ? "up" as const : "down" as const;

    signals.push({
      key: def.key,
      name: def.name,
      description: def.description,
      color: def.color,
      unit: def.unit,
      data,
      latest,
      change4w,
      direction,
    });
  }

  return signals;
}
