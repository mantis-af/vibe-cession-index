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
    affordability?: { score: number; income: number; homePrice: number; monthlyMortgage: number; housingBurden: number; homeAppreciation: number };
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

// ─── Nowcast channel types ───

export interface NowcastPoint {
  date: string;
  official: number | null;     // Actual official value (only on release dates)
  nowcast: number | null;      // Our weekly estimate of the current official level
  isCurrentNowcast: boolean;   // True for the latest nowcast (the "prediction")
}

export interface NowcastChannel {
  key: string;
  name: string;
  color: string;
  altSignal: string;           // What we measure weekly
  officialMetric: string;      // What we're nowcasting
  unit: string;                // "%" , "Index", "Thousands"
  oosR2: number;               // Validated nowcast quality
  currentNowcast: number | null;
  lastOfficial: number | null;
  lastOfficialDate: string;
  direction: "up" | "down" | "flat";
  data: NowcastPoint[];
}

export const SIGNAL_LABELS: Record<keyof MetroSignals, string> = {
  jobPostingsVelocity: "New Business Apps",
  wageToRentRatio: "AI Job Search",
  smallBizHealth: "Small Biz Health",
  googleTrendsAnxiety: "Search Anxiety",
  housingInventory: "Housing Inventory",
  unemploymentClaims: "Unemployment",
  restaurantActivity: "Days on Market",
  buildingPermits: "Price Drops",
};

export const SIGNAL_WEIGHTS: Record<keyof MetroSignals, number> = {
  jobPostingsVelocity: 0.15,
  wageToRentRatio: 0.07,
  smallBizHealth: 0.08,
  googleTrendsAnxiety: 0.18,
  housingInventory: 0.12,
  unemploymentClaims: 0.12,
  restaurantActivity: 0.08,
  buildingPermits: 0.08,
};

export const SIGNAL_DESCRIPTIONS: Record<keyof MetroSignals, string> = {
  jobPostingsVelocity: "Weekly new business applications by state (FRED)",
  wageToRentRatio: "AI vs traditional job search ratio (Google Trends)",
  smallBizHealth: "Placeholder for small business health signal",
  googleTrendsAnxiety: "Distress vs aspiration search behavior (Google Trends)",
  housingInventory: "Active housing listings by metro (Redfin)",
  unemploymentClaims: "Unemployment rate + weekly initial claims (BLS/FRED)",
  restaurantActivity: "Median days on market for homes (Redfin)",
  buildingPermits: "Percentage of listings with price reductions (Redfin)",
};
