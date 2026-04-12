export interface MetroSignals {
  jobPostingsVelocity: number; // Z-score
  wageToRentRatio: number;
  smallBizHealth: number;
  googleTrendsAnxiety: number;
  housingInventory: number;
  unemploymentClaims: number;
  restaurantActivity: number;
  buildingPermits: number;
}

export interface MetroWeeklySnapshot {
  week: string; // ISO date string (Monday of the week)
  compositeScore: number; // 0-100
  signals: MetroSignals;
  officialIndex: number; // 0-100 based on govt data
  vibesGap: number; // composite - official
}

export interface Metro {
  id: string;
  name: string;
  state: string;
  population: number;
  currentScore: number;
  previousScore: number;
  weekOverWeekChange: number;
  vibesGap: number;
  currentSignals: MetroSignals;
  trend: "improving" | "declining" | "stable";
  history: MetroWeeklySnapshot[];
  quarterly: Array<{ quarter: string; avgScore: number; weeksInQuarter: number; high: number; low: number; qoqChange: number | null }>;
  sentimentDrivers: { drivers: Array<{ signal: string; zScoreChange: number; weight: number; scoreImpact: number; direction: "up" | "down" | "flat"; currentZScore: number }>; periodChange: number; recentAvg: number; priorAvg: number };
  context: {
    cpi?: { latestMonth: string; indexValue: number; inflationYoY: number };
    gas?: { latestWeek: string; price: number; region: string };
    ai?: { latestAiRatio: number; aiMomentum: number };
    homeValue?: { latestMonth: string; zhvi: number; yoyPct: number };
    bizApps?: { latestWeek: string; value: number; change4wk: number | null };
    coincidentIndex?: { latestMonth: string; value: number };
  };
}

export interface NationalSummary {
  averageScore: number;
  medianScore: number;
  highestMetro: { name: string; score: number };
  lowestMetro: { name: string; score: number };
  averageVibesGap: number;
  metrosImproving: number;
  metrosDeclining: number;
  metrosStable: number;
  weekOf: string;
}

export const SIGNAL_LABELS: Record<keyof MetroSignals, string> = {
  jobPostingsVelocity: "Job Postings",
  wageToRentRatio: "Wage-to-Rent",
  smallBizHealth: "Small Biz Health",
  googleTrendsAnxiety: "Search Anxiety",
  housingInventory: "Housing Market",
  unemploymentClaims: "Unemployment Claims",
  restaurantActivity: "Restaurant Activity",
  buildingPermits: "Building Permits",
};

export const SIGNAL_WEIGHTS: Record<keyof MetroSignals, number> = {
  jobPostingsVelocity: 0.20,
  wageToRentRatio: 0.15,
  smallBizHealth: 0.15,
  googleTrendsAnxiety: 0.15,
  housingInventory: 0.10,
  unemploymentClaims: 0.10,
  restaurantActivity: 0.10,
  buildingPermits: 0.05,
};

export const SIGNAL_DESCRIPTIONS: Record<keyof MetroSignals, string> = {
  jobPostingsVelocity: "Week-over-week change in job posting volume",
  wageToRentRatio: "Posted wages vs. asking rents trend",
  smallBizHealth: "Net new business openings minus closings",
  googleTrendsAnxiety: "Distress vs. aspiration search ratio (inverted)",
  housingInventory: "Active listings and days-on-market trend",
  unemploymentClaims: "Initial weekly unemployment claims (inverted)",
  restaurantActivity: "Restaurant reservation and booking volume",
  buildingPermits: "New building permit applications",
};
