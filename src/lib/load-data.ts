import { Metro, MetroSignals, MetroWeeklySnapshot, NationalSummary } from "./types";
import { getDb } from "./db";

// For pages that still import JSON directly
import narrativeJson from "@/data/narrative.json";
export { narrativeJson };

const EMPTY_SIGNALS: MetroSignals = {
  jobPostingsVelocity: 0, wageToRentRatio: 0, smallBizHealth: 0,
  googleTrendsAnxiety: 0, housingInventory: 0, unemploymentClaims: 0,
  restaurantActivity: 0, buildingPermits: 0,
};

// ─── Load from SQLite at build time ───

function loadMetrosFromDb(): Metro[] {
  const d = getDb();

  // Get all metro IDs from series that have behavioral index data
  const metroIds = d.prepare(`
    SELECT DISTINCT metro FROM series
    WHERE scope = 'metro' AND metro IS NOT NULL
    AND id LIKE '%_index'
  `).all() as Array<{ metro: string }>;

  const metros: Metro[] = [];

  for (const { metro: mid } of metroIds) {
    // Get metro info
    const info = d.prepare(`
      SELECT metro, metro_name, state FROM series
      WHERE metro = ? AND scope = 'metro' LIMIT 1
    `).get(mid) as { metro: string; metro_name: string; state: string } | undefined;
    if (!info) continue;

    // Get behavioral index history
    const indexId = `metro_${mid}_index`;
    const officialId = `metro_${mid}_official`;
    const gapId = `metro_${mid}_gap`;

    const indexPts = d.prepare("SELECT date, value FROM datapoints WHERE series_id = ? ORDER BY date").all(indexId) as Array<{ date: string; value: number }>;
    const officialPts = d.prepare("SELECT date, value FROM datapoints WHERE series_id = ? ORDER BY date").all(officialId) as Array<{ date: string; value: number }>;
    const gapPts = d.prepare("SELECT date, value FROM datapoints WHERE series_id = ? ORDER BY date").all(gapId) as Array<{ date: string; value: number }>;

    if (indexPts.length === 0) continue;

    const officialMap = new Map(officialPts.map(p => [p.date, p.value]));
    const gapMap = new Map(gapPts.map(p => [p.date, p.value]));

    // Build history (use last 52 weeks for sparklines on overview)
    const recentPts = indexPts.slice(-52);
    const history: MetroWeeklySnapshot[] = recentPts.map(p => ({
      week: p.date,
      compositeScore: Math.round(p.value),
      officialIndex: Math.round(officialMap.get(p.date) ?? 50),
      vibesGap: Math.round(gapMap.get(p.date) ?? 0),
      signals: EMPTY_SIGNALS,
    }));

    const current = history[history.length - 1] ?? { compositeScore: 50, vibesGap: 0 };
    const previous = history.length > 1 ? history[history.length - 2] : current;

    // Trend
    let trend: "improving" | "declining" | "stable" = "stable";
    if (history.length >= 8) {
      const recent4 = history.slice(-4).reduce((s, h) => s + h.compositeScore, 0) / 4;
      const prior4 = history.slice(-8, -4).reduce((s, h) => s + h.compositeScore, 0) / 4;
      if (recent4 - prior4 > 2) trend = "improving";
      else if (recent4 - prior4 < -2) trend = "declining";
    }

    // Population (from config — hardcoded for now, could be in DB)
    const popMap: Record<string, number> = {
      nyc: 8336817, lax: 3979576, chi: 2693976, hou: 2304580, phx: 1608139,
      phl: 1603797, sat: 1547253, sdg: 1423851, dal: 1304379, sjc: 1013240,
      aus: 978908, jax: 949611, sfo: 873965, cmh: 905748, clt: 874579,
      ind: 887642, sea: 737015, den: 715522, dca: 689545, bna: 689447,
      ftw: 958692, okc: 687725, elp: 678815, las: 660929, pdx: 652503,
      mem: 633104, lou: 628594, bal: 585708, mil: 577222, abq: 564559,
      tuc: 542629, msa: 504258, atl: 498715, kcm: 508090, ral: 474069,
      mia: 442241, tpa: 384959, stl: 301578, pit: 302971, cin: 309317,
      orl: 307573, cle: 372624, min: 429954, det: 639111, slc: 200831,
      bos: 675647, ric: 226610, bir: 200733, har: 121054, buf: 278349,
    };

    metros.push({
      id: mid,
      name: info.metro_name?.split(",")[0] ?? mid,
      state: info.state ?? "",
      population: popMap[mid] ?? 500000,
      currentScore: current.compositeScore,
      previousScore: previous.compositeScore,
      weekOverWeekChange: current.compositeScore - previous.compositeScore,
      vibesGap: current.vibesGap,
      currentSignals: EMPTY_SIGNALS,
      trend,
      history,
      quarterly: [],
      sentimentDrivers: { drivers: [], periodChange: 0, recentAvg: 0, priorAvg: 0 },
      context: {},
    });
  }

  return metros;
}

function loadNationalHistory(): MetroWeeklySnapshot[] {
  const d = getDb();
  // Average behavioral index across all metros by date
  const rows = d.prepare(`
    SELECT dp.date, AVG(dp.value) as avg_score
    FROM datapoints dp
    JOIN series s ON dp.series_id = s.id
    WHERE s.id LIKE 'metro_%_index'
    AND s.scope = 'metro'
    GROUP BY dp.date
    ORDER BY dp.date
  `).all() as Array<{ date: string; avg_score: number }>;

  // Also get average official
  const officialRows = d.prepare(`
    SELECT dp.date, AVG(dp.value) as avg_score
    FROM datapoints dp
    JOIN series s ON dp.series_id = s.id
    WHERE s.id LIKE 'metro_%_official'
    AND s.scope = 'metro'
    GROUP BY dp.date
    ORDER BY dp.date
  `).all() as Array<{ date: string; avg_score: number }>;

  const officialMap = new Map(officialRows.map(r => [r.date, r.avg_score]));

  return rows.map(r => {
    const official = Math.round(officialMap.get(r.date) ?? 50);
    const composite = Math.round(r.avg_score);
    return {
      week: r.date,
      compositeScore: composite,
      officialIndex: official,
      vibesGap: composite - official,
      signals: EMPTY_SIGNALS,
    };
  });
}

function loadNationalSummary(metros: Metro[]): NationalSummary {
  if (metros.length === 0) {
    return { averageScore: 50, medianScore: 50, highestMetro: { name: "—", score: 50 }, lowestMetro: { name: "—", score: 50 }, averageVibesGap: 0, metrosImproving: 0, metrosDeclining: 0, metrosStable: 0, weekOf: "" };
  }
  const scores = metros.map(m => m.currentScore).sort((a, b) => a - b);
  const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
  const highest = metros.reduce((best, m) => m.currentScore > best.currentScore ? m : best);
  const lowest = metros.reduce((worst, m) => m.currentScore < worst.currentScore ? m : worst);
  const avgGap = metros.reduce((s, m) => s + m.vibesGap, 0) / metros.length;

  return {
    averageScore: Math.round(avg * 10) / 10,
    medianScore: scores[Math.floor(scores.length / 2)],
    highestMetro: { name: highest.name, score: highest.currentScore },
    lowestMetro: { name: lowest.name, score: lowest.currentScore },
    averageVibesGap: Math.round(avgGap * 10) / 10,
    metrosImproving: metros.filter(m => m.trend === "improving").length,
    metrosDeclining: metros.filter(m => m.trend === "declining").length,
    metrosStable: metros.filter(m => m.trend === "stable").length,
    weekOf: metros[0]?.history[metros[0].history.length - 1]?.week ?? "",
  };
}

// ─── Exports ───

export const METROS = loadMetrosFromDb();
export const NATIONAL_SUMMARY = loadNationalSummary(METROS);
export const NATIONAL_HISTORY = loadNationalHistory();
export const NATIONAL_QUARTERLY: Array<{ quarter: string; avgScore: number; weeksInQuarter: number; high: number; low: number; qoqChange: number | null }> = [];
export const NATIONAL_DRIVERS = { drivers: [] as Array<{ signal: string; zScoreChange: number; weight: number; scoreImpact: number; direction: "up" | "down" | "flat"; currentZScore: number }>, periodChange: 0, recentAvg: 0, priorAvg: 0 };
export const MACRO_DATA: Record<string, unknown> = {};
export const NATIONAL_CPI: Record<string, unknown> = {};
export const GAS_NATIONAL: Record<string, unknown> = {};
export const EXPANDED_DATA: Record<string, unknown> = {};
export const GENERATED_AT = new Date().toISOString();

export type { MetroWeeklySnapshot };

// Keep these types for compatibility
export type QuarterlyBenchmark = { quarter: string; avgScore: number; weeksInQuarter: number; high: number; low: number; qoqChange: number | null };
export type SentimentDriver = { signal: string; zScoreChange: number; weight: number; scoreImpact: number; direction: "up" | "down" | "flat"; currentZScore: number };
export type SentimentDrivers = { drivers: SentimentDriver[]; periodChange: number; recentAvg: number; priorAvg: number };

/**
 * Load full metro data from SQLite (all history, not just 52-week sparkline).
 */
export function loadFullMetro(metroId: string): Metro | null {
  const d = getDb();

  const indexId = `metro_${metroId}_index`;
  const officialId = `metro_${metroId}_official`;
  const gapId = `metro_${metroId}_gap`;

  const info = d.prepare("SELECT metro, metro_name, state FROM series WHERE metro = ? AND scope = 'metro' LIMIT 1").get(metroId) as { metro: string; metro_name: string; state: string } | undefined;
  if (!info) return METROS.find(m => m.id === metroId) ?? null;

  const indexPts = d.prepare("SELECT date, value FROM datapoints WHERE series_id = ? ORDER BY date").all(indexId) as Array<{ date: string; value: number }>;
  const officialPts = d.prepare("SELECT date, value FROM datapoints WHERE series_id = ? ORDER BY date").all(officialId) as Array<{ date: string; value: number }>;
  const gapPts = d.prepare("SELECT date, value FROM datapoints WHERE series_id = ? ORDER BY date").all(gapId) as Array<{ date: string; value: number }>;

  if (indexPts.length === 0) return METROS.find(m => m.id === metroId) ?? null;

  const officialMap = new Map(officialPts.map(p => [p.date, p.value]));
  const gapMap = new Map(gapPts.map(p => [p.date, p.value]));

  const history: MetroWeeklySnapshot[] = indexPts.map(p => ({
    week: p.date,
    compositeScore: Math.round(p.value),
    officialIndex: Math.round(officialMap.get(p.date) ?? 50),
    vibesGap: Math.round(gapMap.get(p.date) ?? 0),
    signals: EMPTY_SIGNALS,
  }));

  const current = history[history.length - 1];
  const previous = history.length > 1 ? history[history.length - 2] : current;

  let trend: "improving" | "declining" | "stable" = "stable";
  if (history.length >= 8) {
    const r4 = history.slice(-4).reduce((s, h) => s + h.compositeScore, 0) / 4;
    const p4 = history.slice(-8, -4).reduce((s, h) => s + h.compositeScore, 0) / 4;
    if (r4 - p4 > 2) trend = "improving";
    else if (r4 - p4 < -2) trend = "declining";
  }

  const popMap: Record<string, number> = {
    nyc: 8336817, lax: 3979576, chi: 2693976, hou: 2304580, phx: 1608139,
    phl: 1603797, sat: 1547253, sdg: 1423851, dal: 1304379, sjc: 1013240,
    aus: 978908, jax: 949611, sfo: 873965, cmh: 905748, clt: 874579,
    ind: 887642, sea: 737015, den: 715522, dca: 689545, bna: 689447,
    ftw: 958692, okc: 687725, elp: 678815, las: 660929, pdx: 652503,
    mem: 633104, lou: 628594, bal: 585708, mil: 577222, abq: 564559,
    tuc: 542629, msa: 504258, atl: 498715, kcm: 508090, ral: 474069,
    mia: 442241, tpa: 384959, stl: 301578, pit: 302971, cin: 309317,
    orl: 307573, cle: 372624, min: 429954, det: 639111, slc: 200831,
    bos: 675647, ric: 226610, bir: 200733, har: 121054, buf: 278349,
  };

  return {
    id: metroId,
    name: info.metro_name?.split(",")[0] ?? metroId,
    state: info.state ?? "",
    population: popMap[metroId] ?? 500000,
    currentScore: current.compositeScore,
    previousScore: previous.compositeScore,
    weekOverWeekChange: current.compositeScore - previous.compositeScore,
    vibesGap: current.vibesGap,
    currentSignals: EMPTY_SIGNALS,
    trend,
    history,
    quarterly: [],
    sentimentDrivers: { drivers: [], periodChange: 0, recentAvg: 0, priorAvg: 0 },
    context: {},
  };
}
