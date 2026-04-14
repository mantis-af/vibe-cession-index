import { Metro, MetroSignals, MetroWeeklySnapshot, NationalSummary, NowcastChannel, NowcastPoint } from "./types";
import { getDb } from "./db";
import { linearRegression, ridgeRegression } from "./regression";

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

    // Load actual signal z-scores
    const SIGNAL_DB_MAP: Record<string, keyof MetroSignals> = {
      google_trends_anxiety: "googleTrendsAnxiety",
      unemployment_rate: "unemploymentClaims",
      initial_claims: "unemploymentClaims",
      housing_inventory: "housingInventory",
      housing_dom: "restaurantActivity",
      housing_price_drops: "buildingPermits",
      new_biz_apps: "jobPostingsVelocity",
      ai_job_ratio: "wageToRentRatio",
    };
    const latestSignals: MetroSignals = { ...EMPTY_SIGNALS };
    for (const [dbKey, tsKey] of Object.entries(SIGNAL_DB_MAP)) {
      const sigId = `metro_${mid}_sig_${dbKey}`;
      const latest = d.prepare("SELECT value FROM datapoints WHERE series_id = ? ORDER BY date DESC LIMIT 1").get(sigId) as { value: number } | undefined;
      if (latest) latestSignals[tsKey] = latest.value;
    }

    // Build history (use last 52 weeks for sparklines on overview)
    const recentPts = indexPts.slice(-52);
    const history: MetroWeeklySnapshot[] = recentPts.map(p => ({
      week: p.date,
      compositeScore: Math.round(p.value),
      officialIndex: Math.round(officialMap.get(p.date) ?? 50),
      vibesGap: Math.round(gapMap.get(p.date) ?? 0),
      signals: EMPTY_SIGNALS, // per-week signals not needed for sparklines
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
      currentSignals: latestSignals,
      trend,
      history,
      quarterly: [],
      sentimentDrivers: { drivers: [], periodChange: 0, recentAvg: 0, priorAvg: 0 },
      context: {},
    });
  }

  return metros;
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

// ─── Nowcast Channels ───
// Q3 validated: AR(3) baseline + multi-signal features where they help.
// Each channel uses AR(3) lags of the target + relevant alt-data signals + market features.

const NOWCAST_DEFS = [
  {
    key: "savings", name: "Financial Health", color: "#6366f1",
    officialMetric: "Personal Savings Rate", officialId: "expanded_savings_rate", unit: "%",
    altSignals: [
      { metroKey: "initial_claims", invert: true },
      { metroKey: "google_trends_anxiety", invert: true },
      { metroKey: "housing_price_drops", invert: true },
    ],
    marketFeatures: ["expanded_sp500", "consumer_umcsent"],
    description: "AR(3) + claims, anxiety, price drops, S&P 500, sentiment",
  },
  {
    key: "unemployment", name: "Unemployment", color: "#ef4444",
    officialMetric: "Unemployment Rate", officialId: "macro_unemployment_rate_national", unit: "%",
    altSignals: [
      { metroKey: "initial_claims", invert: false },
      { metroKey: "google_trends_anxiety", invert: false },
      { metroKey: "new_biz_apps", invert: true },
    ],
    marketFeatures: ["expanded_continued_claims", "expanded_job_openings"],
    description: "AR(3) + claims, anxiety, biz apps, continued claims, JOLTS",
  },
  {
    key: "participation", name: "Workforce Engagement", color: "#8b5cf6",
    officialMetric: "Labor Force Participation", officialId: "labor_civpart", unit: "%",
    altSignals: [
      { metroKey: "ai_job_ratio", invert: false },
      { metroKey: "initial_claims", invert: true },
      { metroKey: "new_biz_apps", invert: false },
    ],
    marketFeatures: ["expanded_job_openings"],
    description: "AR(3) + AI job ratio, claims, biz apps, JOLTS",
  },
  {
    key: "inflation", name: "Cost Pressure", color: "#f59e0b",
    officialMetric: "CPI Inflation (YoY)", officialId: "inflation_cpiaucsl", unit: "%",
    altSignals: [
      { metroKey: "housing_inventory", invert: false },
      { metroKey: "housing_price_drops", invert: false },
    ],
    marketFeatures: ["gas_national", "expanded_mortgage_30y", "yield_10y"],
    officialTransform: "yoy" as const,
    description: "AR(3) + inventory, price drops, gas, mortgage, 10Y yield",
  },
  {
    key: "jobs", name: "Labor Demand", color: "#22c55e",
    officialMetric: "JOLTS Job Openings", officialId: "expanded_job_openings", unit: "Thousands",
    altSignals: [
      { metroKey: "initial_claims", invert: true },
      { metroKey: "new_biz_apps", invert: false },
    ],
    marketFeatures: ["expanded_continued_claims", "smallbiz_busappwnsaus"],
    description: "AR(3) + claims, biz apps, continued claims, national biz apps",
  },
  {
    key: "housing", name: "Housing Prices", color: "#10b981",
    officialMetric: "Case-Shiller Home Prices", officialId: "expanded_case_shiller", unit: "Index",
    altSignals: [
      { metroKey: "housing_dom", invert: true },
      { metroKey: "housing_inventory", invert: true },
      { metroKey: "housing_price_drops", invert: true },
    ],
    marketFeatures: ["expanded_mortgage_30y", "expanded_housing_starts"],
    description: "AR(3) + DOM, inventory, price drops, mortgage rate, starts",
  },
  {
    key: "sentiment", name: "Consumer Mood", color: "#f97316",
    officialMetric: "Consumer Sentiment (UMich)", officialId: "consumer_umcsent", unit: "Index",
    altSignals: [
      { metroKey: "google_trends_anxiety", invert: true },
      { metroKey: "initial_claims", invert: true },
    ],
    marketFeatures: ["expanded_sp500", "gas_national", "expanded_vix"],
    description: "AR(3) + anxiety, claims, S&P 500, gas, VIX",
  },
];

/** Load a metro alt-signal averaged by month */
function loadAltSignalMonthly(d: ReturnType<typeof getDb>, metroKey: string, invert: boolean): Map<string, number> {
  const rows = d.prepare(`
    SELECT dp.date, AVG(dp.value) as avg_z
    FROM datapoints dp JOIN series s ON dp.series_id = s.id
    WHERE s.id LIKE ? AND s.scope = 'metro'
    GROUP BY dp.date ORDER BY dp.date
  `).all(`metro_%_sig_${metroKey}`) as Array<{ date: string; avg_z: number }>;

  const byMonth = new Map<string, number[]>();
  for (const r of rows) {
    const month = r.date.slice(0, 7);
    const day = parseInt(r.date.slice(8, 10));
    if (day <= 21) {
      if (!byMonth.has(month)) byMonth.set(month, []);
      byMonth.get(month)!.push(invert ? -r.avg_z : r.avg_z);
    }
  }
  const result = new Map<string, number>();
  for (const [m, vals] of byMonth) {
    if (vals.length >= 2) result.set(m, vals.reduce((a, b) => a + b, 0) / vals.length);
  }
  return result;
}

/** Load a national series averaged by month */
function loadMarketFeatureMonthly(d: ReturnType<typeof getDb>, seriesId: string): Map<string, number> {
  const rows = d.prepare("SELECT date, value FROM datapoints WHERE series_id = ? ORDER BY date")
    .all(seriesId) as Array<{ date: string; value: number }>;

  const byMonth = new Map<string, number[]>();
  for (const r of rows) {
    const month = r.date.slice(0, 7);
    if (!byMonth.has(month)) byMonth.set(month, []);
    byMonth.get(month)!.push(r.value);
  }
  const result = new Map<string, number>();
  for (const [m, vals] of byMonth) {
    result.set(m, vals.reduce((a, b) => a + b, 0) / vals.length);
  }
  return result;
}

function loadNowcastChannels(): NowcastChannel[] {
  const d = getDb();
  const channels: NowcastChannel[] = [];
  const AR_LAGS = 3;

  for (const ch of NOWCAST_DEFS) {
    try {
      // ─── Load official data ───
      const offRows = d.prepare("SELECT date, value FROM datapoints WHERE series_id = ? ORDER BY date")
        .all(ch.officialId) as Array<{ date: string; value: number }>;

      if (offRows.length < 15) { channels.push(emptyNowcast(ch)); continue; }

      // Transform official if needed (YoY % for CPI)
      let officialPts = offRows;
      if ("officialTransform" in ch && ch.officialTransform === "yoy") {
        const transformed: typeof offRows = [];
        for (let i = 12; i < offRows.length; i++) {
          const prev = offRows[i - 12].value;
          if (prev !== 0) {
            transformed.push({ date: offRows[i].date, value: Math.round(((offRows[i].value - prev) / Math.abs(prev)) * 10000) / 100 });
          }
        }
        officialPts = transformed;
      }

      // Build official by-month map
      const offByMonth = new Map<string, number>();
      for (const r of officialPts) offByMonth.set(r.date.slice(0, 7), r.value);
      const sortedMonths = [...offByMonth.keys()].sort();

      if (sortedMonths.length < AR_LAGS + 10) { channels.push(emptyNowcast(ch)); continue; }

      // ─── Load ALL alt-signal features ───
      const altFeatureMaps: Map<string, number>[] = [];
      for (const sig of ch.altSignals) {
        altFeatureMaps.push(loadAltSignalMonthly(d, sig.metroKey, sig.invert));
      }

      // ─── Load market features ───
      const marketFeatureMaps: Map<string, number>[] = [];
      for (const sid of ch.marketFeatures ?? []) {
        marketFeatureMaps.push(loadMarketFeatureMonthly(d, sid));
      }

      const nExtraFeatures = altFeatureMaps.length + marketFeatureMaps.length;

      // ─── Build feature matrix ───
      const trainX: number[][] = [];
      const trainY: number[] = [];

      for (let i = AR_LAGS; i < sortedMonths.length; i++) {
        const m = sortedMonths[i];
        const y = offByMonth.get(m)!;

        // AR features
        const features: number[] = [];
        for (let j = 1; j <= AR_LAGS; j++) {
          features.push(offByMonth.get(sortedMonths[i - j])!);
        }

        // Alt-signal features (skip row if any missing)
        let skip = false;
        for (const altMap of altFeatureMaps) {
          const v = altMap.get(m);
          if (v === undefined) { skip = true; break; }
          features.push(v);
        }
        if (skip) continue;

        // Market features (use 0 if missing — these are national and mostly available)
        for (const mktMap of marketFeatureMaps) {
          features.push(mktMap.get(m) ?? 0);
        }

        trainX.push(features);
        trainY.push(y);
      }

      if (trainX.length < AR_LAGS + nExtraFeatures + 5) { channels.push(emptyNowcast(ch)); continue; }

      // Train ridge regression (higher lambda for more features to prevent overfitting)
      const lambda = nExtraFeatures > 3 ? 0.1 : 0.01;
      const model = ridgeRegression(trainX, trainY, lambda);
      const nFeatures = model.beta.length;

      // ─── Predict function ───
      const predict = (month: string, arLags: number[]): number | null => {
        if (arLags.length < AR_LAGS) return null;
        const features = [...arLags];
        for (const altMap of altFeatureMaps) {
          const v = altMap.get(month);
          if (v === undefined) return null;
          features.push(v);
        }
        for (const mktMap of marketFeatureMaps) {
          features.push(mktMap.get(month) ?? 0);
        }
        if (features.length !== nFeatures) return null;
        let pred = model.intercept;
        for (let j = 0; j < nFeatures; j++) pred += model.beta[j] * features[j];
        return Math.round(pred * 100) / 100;
      };

      // ─── Build the nowcast timeseries (last 24 months) ───
      const data: NowcastPoint[] = [];
      const startIdx = Math.max(AR_LAGS, sortedMonths.length - 24);

      for (let i = startIdx; i < sortedMonths.length; i++) {
        const m = sortedMonths[i];
        const offVal = offByMonth.get(m) ?? null;
        const arLags = [];
        for (let j = 1; j <= AR_LAGS; j++) {
          if (i - j >= 0) arLags.push(offByMonth.get(sortedMonths[i - j])!);
        }
        const nowcastVal = predict(m, arLags);

        data.push({
          date: m,
          official: offVal !== null ? Math.round(offVal * 100) / 100 : null,
          nowcast: nowcastVal,
          isCurrentNowcast: false,
        });
      }

      // ─── Current month nowcast ───
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      let currentNowcast: number | null = null;

      const lastMonths = sortedMonths.slice(-AR_LAGS);
      if (lastMonths.length === AR_LAGS) {
        const arLags = lastMonths.map(m => offByMonth.get(m)!);
        currentNowcast = predict(currentMonth, arLags);
      }

      // Add current month
      const lastDataMonth = data[data.length - 1]?.date;
      if (lastDataMonth !== currentMonth && currentNowcast !== null) {
        data.push({ date: currentMonth, official: null, nowcast: currentNowcast, isCurrentNowcast: true });
      } else if (data.length > 0 && data[data.length - 1].date === currentMonth) {
        data[data.length - 1].isCurrentNowcast = true;
        if (currentNowcast !== null) data[data.length - 1].nowcast = currentNowcast;
      }

      const lastOff = officialPts[officialPts.length - 1];
      const direction = currentNowcast !== null && lastOff
        ? (currentNowcast > lastOff.value ? "up" : currentNowcast < lastOff.value ? "down" : "flat")
        : "flat";

      channels.push({
        key: ch.key,
        name: ch.name,
        color: ch.color,
        altSignal: ch.description ?? "AR(3) + multi-signal",
        officialMetric: ch.officialMetric,
        unit: ch.unit,
        oosR2: model.rSquared,
        currentNowcast,
        lastOfficial: lastOff ? Math.round(lastOff.value * 100) / 100 : null,
        lastOfficialDate: lastOff?.date ?? "",
        direction: direction as "up" | "down" | "flat",
        data,
      });

    } catch {
      channels.push(emptyNowcast(ch));
    }
  }
  return channels;
}

function emptyNowcast(ch: typeof NOWCAST_DEFS[number]): NowcastChannel {
  return { key: ch.key, name: ch.name, color: ch.color, altSignal: ch.description ?? "", officialMetric: ch.officialMetric, unit: ch.unit, oosR2: 0, currentNowcast: null, lastOfficial: null, lastOfficialDate: "", direction: "flat", data: [] };
}

// ─── Exports ───

export const METROS = loadMetrosFromDb();
export const NATIONAL_SUMMARY = loadNationalSummary(METROS);
export const NOWCAST_CHANNELS = loadNowcastChannels();
export const GENERATED_AT = new Date().toISOString();

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
