import { Metro, MetroSignals, MetroWeeklySnapshot, NationalSummary } from "./types";

// Deterministic pseudo-random from seed
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function gaussianRandom(rng: () => number, mean: number, stddev: number): number {
  const u1 = rng();
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stddev;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

interface MetroSeed {
  id: string;
  name: string;
  state: string;
  population: number;
  baseBehavioral: number; // 0-100 baseline behavioral score
  baseOfficial: number;   // 0-100 baseline official score
  volatility: number;     // how much it swings week to week
  trendBias: number;      // positive = improving, negative = declining
}

const METRO_SEEDS: MetroSeed[] = [
  { id: "nyc", name: "New York", state: "NY", population: 8336817, baseBehavioral: 52, baseOfficial: 58, volatility: 3.5, trendBias: -0.4 },
  { id: "lax", name: "Los Angeles", state: "CA", population: 3979576, baseBehavioral: 45, baseOfficial: 55, volatility: 4.0, trendBias: -0.8 },
  { id: "chi", name: "Chicago", state: "IL", population: 2693976, baseBehavioral: 48, baseOfficial: 52, volatility: 3.0, trendBias: -0.3 },
  { id: "hou", name: "Houston", state: "TX", population: 2304580, baseBehavioral: 62, baseOfficial: 60, volatility: 3.5, trendBias: 0.5 },
  { id: "phx", name: "Phoenix", state: "AZ", population: 1608139, baseBehavioral: 58, baseOfficial: 61, volatility: 4.5, trendBias: 0.3 },
  { id: "phl", name: "Philadelphia", state: "PA", population: 1603797, baseBehavioral: 44, baseOfficial: 50, volatility: 2.8, trendBias: -0.5 },
  { id: "sat", name: "San Antonio", state: "TX", population: 1547253, baseBehavioral: 55, baseOfficial: 57, volatility: 2.5, trendBias: 0.2 },
  { id: "sdg", name: "San Diego", state: "CA", population: 1423851, baseBehavioral: 50, baseOfficial: 59, volatility: 3.2, trendBias: -0.3 },
  { id: "dal", name: "Dallas", state: "TX", population: 1304379, baseBehavioral: 64, baseOfficial: 62, volatility: 3.8, trendBias: 0.6 },
  { id: "sjc", name: "San Jose", state: "CA", population: 1013240, baseBehavioral: 56, baseOfficial: 68, volatility: 5.0, trendBias: -1.0 },
  { id: "aus", name: "Austin", state: "TX", population: 978908, baseBehavioral: 66, baseOfficial: 65, volatility: 4.2, trendBias: 0.4 },
  { id: "jax", name: "Jacksonville", state: "FL", population: 949611, baseBehavioral: 53, baseOfficial: 55, volatility: 2.5, trendBias: 0.1 },
  { id: "sfo", name: "San Francisco", state: "CA", population: 873965, baseBehavioral: 42, baseOfficial: 60, volatility: 5.5, trendBias: -1.2 },
  { id: "cmh", name: "Columbus", state: "OH", population: 905748, baseBehavioral: 57, baseOfficial: 56, volatility: 2.0, trendBias: 0.3 },
  { id: "clt", name: "Charlotte", state: "NC", population: 874579, baseBehavioral: 61, baseOfficial: 60, volatility: 3.0, trendBias: 0.5 },
  { id: "ind", name: "Indianapolis", state: "IN", population: 887642, baseBehavioral: 50, baseOfficial: 53, volatility: 2.2, trendBias: -0.1 },
  { id: "sea", name: "Seattle", state: "WA", population: 737015, baseBehavioral: 54, baseOfficial: 63, volatility: 4.0, trendBias: -0.6 },
  { id: "den", name: "Denver", state: "CO", population: 715522, baseBehavioral: 59, baseOfficial: 62, volatility: 3.5, trendBias: 0.2 },
  { id: "dca", name: "Washington", state: "DC", population: 689545, baseBehavioral: 55, baseOfficial: 64, volatility: 3.0, trendBias: -0.4 },
  { id: "bna", name: "Nashville", state: "TN", population: 689447, baseBehavioral: 63, baseOfficial: 61, volatility: 3.8, trendBias: 0.7 },
];

function generateSignals(rng: () => number, baseScore: number, volatility: number): MetroSignals {
  const base = (baseScore - 50) / 25; // convert 0-100 to roughly -2..2 z-score range
  return {
    jobPostingsVelocity: clamp(gaussianRandom(rng, base, volatility * 0.04), -3, 3),
    wageToRentRatio: clamp(gaussianRandom(rng, base * 0.8, volatility * 0.05), -3, 3),
    smallBizHealth: clamp(gaussianRandom(rng, base * 0.9, volatility * 0.04), -3, 3),
    googleTrendsAnxiety: clamp(gaussianRandom(rng, base * 1.1, volatility * 0.06), -3, 3),
    housingInventory: clamp(gaussianRandom(rng, base * 0.7, volatility * 0.04), -3, 3),
    unemploymentClaims: clamp(gaussianRandom(rng, base * 0.85, volatility * 0.03), -3, 3),
    restaurantActivity: clamp(gaussianRandom(rng, base * 0.95, volatility * 0.05), -3, 3),
    buildingPermits: clamp(gaussianRandom(rng, base * 0.6, volatility * 0.04), -3, 3),
  };
}

function signalsToScore(signals: MetroSignals): number {
  const weighted =
    signals.jobPostingsVelocity * 0.20 +
    signals.wageToRentRatio * 0.15 +
    signals.smallBizHealth * 0.15 +
    signals.googleTrendsAnxiety * 0.15 +
    signals.housingInventory * 0.10 +
    signals.unemploymentClaims * 0.10 +
    signals.restaurantActivity * 0.10 +
    signals.buildingPermits * 0.05;
  // Convert z-score (-3..3) to 0-100 scale
  return clamp(Math.round((weighted + 3) / 6 * 100), 0, 100);
}

function generateHistory(seed: MetroSeed, weeks: number): MetroWeeklySnapshot[] {
  const rng = seededRandom(seed.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) * 137);
  const history: MetroWeeklySnapshot[] = [];
  let currentBehavioral = seed.baseBehavioral;
  let currentOfficial = seed.baseOfficial;

  const startDate = new Date("2026-01-05"); // first Monday of 2026

  for (let w = 0; w < weeks; w++) {
    const weekDate = new Date(startDate);
    weekDate.setDate(startDate.getDate() + w * 7);

    // Drift behavioral score with trend + noise
    currentBehavioral += seed.trendBias + gaussianRandom(rng, 0, seed.volatility * 0.3);
    currentBehavioral = clamp(currentBehavioral, 5, 95);

    // Official lags behavioral by ~4-6 weeks, moves slower
    if (w > 4) {
      const lagTarget = history[w - 4]?.compositeScore ?? seed.baseOfficial;
      currentOfficial += (lagTarget - currentOfficial) * 0.15 + gaussianRandom(rng, 0, 0.8);
      currentOfficial = clamp(currentOfficial, 10, 90);
    }

    const signals = generateSignals(rng, currentBehavioral, seed.volatility);
    const compositeScore = signalsToScore(signals);
    const officialIndex = clamp(Math.round(currentOfficial), 10, 90);

    history.push({
      week: weekDate.toISOString().split("T")[0],
      compositeScore,
      signals,
      officialIndex,
      vibesGap: compositeScore - officialIndex,
    });
  }
  return history;
}

function getTrend(history: MetroWeeklySnapshot[]): "improving" | "declining" | "stable" {
  if (history.length < 4) return "stable";
  const recent = history.slice(-4);
  const avgRecent = recent.reduce((s, h) => s + h.compositeScore, 0) / recent.length;
  const prior = history.slice(-8, -4);
  const avgPrior = prior.reduce((s, h) => s + h.compositeScore, 0) / prior.length;
  const diff = avgRecent - avgPrior;
  if (diff > 2) return "improving";
  if (diff < -2) return "declining";
  return "stable";
}

const WEEKS_OF_HISTORY = 14; // ~3.5 months of weekly data

export function generateAllMetros(): Metro[] {
  return METRO_SEEDS.map((seed) => {
    const history = generateHistory(seed, WEEKS_OF_HISTORY);
    const current = history[history.length - 1];
    const previous = history[history.length - 2];

    return {
      id: seed.id,
      name: seed.name,
      state: seed.state,
      population: seed.population,
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

export function generateNationalSummary(metros: Metro[]): NationalSummary {
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

// Pre-generated data for immediate use
export const METROS = generateAllMetros();
export const NATIONAL_SUMMARY = generateNationalSummary(METROS);
