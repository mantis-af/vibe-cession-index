import { Metro, MetroSignals, MetroWeeklySnapshot, NationalSummary } from "./types";
import dashboardJson from "@/data/dashboard.json";

// Map pipeline signal names to our MetroSignals keys
const SIGNAL_KEY_MAP: Record<string, keyof MetroSignals> = {
  google_trends_anxiety: "googleTrendsAnxiety",
  unemployment_rate: "unemploymentClaims",
  initial_claims: "unemploymentClaims",
  housing_inventory: "housingInventory",
  housing_dom: "housingInventory",          // days on market → housing bucket
  housing_price_drops: "buildingPermits",   // reuse slot for price drops signal
  job_postings: "jobPostingsVelocity",
  small_biz_health: "smallBizHealth",
  restaurant_activity: "restaurantActivity",
};

const EMPTY_SIGNALS: MetroSignals = {
  jobPostingsVelocity: 0,
  wageToRentRatio: 0,
  smallBizHealth: 0,
  googleTrendsAnxiety: 0,
  housingInventory: 0,
  unemploymentClaims: 0,
  restaurantActivity: 0,
  buildingPermits: 0,
};

interface RawMetro {
  id: string;
  name: string;
  state: string;
  population: number;
  signalsAvailable: string[];
  signalWeights: Record<string, number>;
  history: Array<{
    week: string;
    compositeScore: number;
    officialIndex: number;
    vibesGap: number;
    signals: Record<string, number>;
  }>;
}

interface RawDashboard {
  summary: {
    generatedAt: string;
    sourcesUsed: string[];
    weekRange: { start: string; end: string };
    metroCount: number;
    nationalAverage: number;
  };
  metros: RawMetro[];
}

function mapSignals(raw: Record<string, number>): MetroSignals {
  const result = { ...EMPTY_SIGNALS };
  for (const [rawKey, value] of Object.entries(raw)) {
    const mappedKey = SIGNAL_KEY_MAP[rawKey];
    if (mappedKey) {
      result[mappedKey] = value;
    }
  }
  return result;
}

function getTrend(history: MetroWeeklySnapshot[]): "improving" | "declining" | "stable" {
  if (history.length < 8) return "stable";
  const recent = history.slice(-4);
  const prior = history.slice(-8, -4);
  const avgRecent = recent.reduce((s, h) => s + h.compositeScore, 0) / recent.length;
  const avgPrior = prior.reduce((s, h) => s + h.compositeScore, 0) / prior.length;
  const diff = avgRecent - avgPrior;
  if (diff > 2) return "improving";
  if (diff < -2) return "declining";
  return "stable";
}

function loadMetros(): Metro[] {
  const data = dashboardJson as unknown as RawDashboard;

  return data.metros.map((raw) => {
    const history: MetroWeeklySnapshot[] = raw.history.map((h) => ({
      week: h.week,
      compositeScore: h.compositeScore,
      officialIndex: h.officialIndex,
      vibesGap: h.vibesGap,
      signals: mapSignals(h.signals),
    }));

    const current = history[history.length - 1];
    const previous = history.length > 1 ? history[history.length - 2] : current;

    return {
      id: raw.id,
      name: raw.name,
      state: raw.state,
      population: raw.population,
      currentScore: current.compositeScore,
      previousScore: previous.compositeScore,
      weekOverWeekChange: current.compositeScore - previous.compositeScore,
      vibesGap: current.vibesGap,
      currentSignals: current.signals,
      trend: getTrend(history),
      history,
    };
  });
}

function loadNationalSummary(metros: Metro[]): NationalSummary {
  const scores = metros.map((m) => m.currentScore).sort((a, b) => a - b);
  const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
  const median = scores[Math.floor(scores.length / 2)];
  const highest = metros.reduce((best, m) => (m.currentScore > best.currentScore ? m : best));
  const lowest = metros.reduce((worst, m) => (m.currentScore < worst.currentScore ? m : worst));
  const avgGap = metros.reduce((s, m) => s + m.vibesGap, 0) / metros.length;

  return {
    averageScore: Math.round(avg * 10) / 10,
    medianScore: median,
    highestMetro: { name: highest.name, score: highest.currentScore },
    lowestMetro: { name: lowest.name, score: lowest.currentScore },
    averageVibesGap: Math.round(avgGap * 10) / 10,
    metrosImproving: metros.filter((m) => m.trend === "improving").length,
    metrosDeclining: metros.filter((m) => m.trend === "declining").length,
    metrosStable: metros.filter((m) => m.trend === "stable").length,
    weekOf: metros[0]?.history[metros[0].history.length - 1]?.week ?? "",
  };
}

export const METROS = loadMetros();
export const NATIONAL_SUMMARY = loadNationalSummary(METROS);
