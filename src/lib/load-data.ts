import { Metro, MetroSignals, MetroWeeklySnapshot, NationalSummary, ChannelTimeseries, ChannelTimeseriesPoint } from "./types";
import { getDb } from "./db";
import { linearRegression, zScore } from "./regression";

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

// ─── Channel Timeseries ───

const CHANNEL_DEFS = [
  {
    key: "labor", name: "Labor Demand", color: "#6366f1",
    altLabel: "New Business Apps + Claims",
    officialLabel: "Nonfarm Payrolls (MoM Δ)",
    altSeriesIds: ["smallbiz_busappwnsaus", "expanded_continued_claims"],
    altDirections: [1, -1], // more biz apps = good, more claims = bad
    officialSeriesId: "labor_payems",
    officialTransform: "mom" as const, // month-over-month change
  },
  {
    key: "cost", name: "Cost of Living", color: "#f59e0b",
    altLabel: "Search Anxiety + Housing Pressure",
    officialLabel: "CPI Inflation (YoY %)",
    altMetroSignals: ["google_trends_anxiety", "housing_inventory"],
    altDirections: [1, 1], // higher anxiety = more cost pressure, higher inventory = pressure
    officialSeriesId: "inflation_cpiaucsl",
    officialTransform: "yoy" as const,
  },
  {
    key: "confidence", name: "Consumer Confidence", color: "#22c55e",
    altLabel: "Search Sentiment (inverted anxiety)",
    officialLabel: "UMich Consumer Sentiment",
    altMetroSignals: ["google_trends_anxiety"],
    altDirections: [-1], // invert: lower anxiety = more confidence
    officialSeriesId: "consumer_umcsent",
    officialTransform: "level" as const,
  },
  {
    key: "financial", name: "Financial Stress", color: "#ef4444",
    altLabel: "HY Spread + Mortgage Rate",
    officialLabel: "Fed Financial Conditions (NFCI)",
    altSeriesIds: ["bond_bamlh0a0hym2", "expanded_mortgage_30y"],
    altDirections: [1, 1], // higher spread + higher rate = more stress
    officialSeriesId: "fin_nfci",
    officialTransform: "level" as const,
  },
  {
    key: "housing", name: "Housing Market", color: "#8b5cf6",
    altLabel: "Inventory + DOM + Price Drops",
    officialLabel: "Case-Shiller Home Prices (YoY %)",
    altMetroSignals: ["housing_inventory", "housing_dom", "housing_price_drops"],
    altDirections: [-1, -1, -1], // all inverted: more inventory/dom/drops = weaker market
    officialSeriesId: "expanded_case_shiller",
    officialTransform: "yoy" as const,
  },
];

function loadChannelTimeseries(): ChannelTimeseries[] {
  const d = getDb();
  const channels: ChannelTimeseries[] = [];
  const PREDICTION_LAG = 8;
  const PREDICTION_HORIZON = 12;

  for (const ch of CHANNEL_DEFS) {
    try {
      // ─── Load alt signal ───
      let altWeekly: Map<string, number> = new Map();

      if ("altSeriesIds" in ch && ch.altSeriesIds) {
        // National series — average them, z-score each first
        for (let si = 0; si < ch.altSeriesIds.length; si++) {
          const pts = d.prepare("SELECT date, value FROM datapoints WHERE series_id = ? ORDER BY date")
            .all(ch.altSeriesIds[si]) as Array<{ date: string; value: number }>;
          if (pts.length < 10) continue;

          // Aggregate daily to weekly (take last value per ISO week)
          const weeklyMap = new Map<string, number>();
          for (const p of pts) {
            const dt = new Date(p.date + "T00:00:00");
            const monday = new Date(dt);
            monday.setDate(dt.getDate() - dt.getDay() + 1);
            const weekKey = monday.toISOString().split("T")[0];
            weeklyMap.set(weekKey, p.value);
          }

          const dates = [...weeklyMap.keys()].sort();
          const values = dates.map(d => weeklyMap.get(d)!);
          const zScored = zScore(values);
          const directed = zScored.map(z => z * ch.altDirections[si]);

          for (let i = 0; i < dates.length; i++) {
            const prev = altWeekly.get(dates[i]) ?? 0;
            const count = altWeekly.has(dates[i]) ? 2 : 1;
            altWeekly.set(dates[i], (prev * (count - 1) + directed[i]) / count);
          }
        }
      } else if ("altMetroSignals" in ch && ch.altMetroSignals) {
        // Metro signals — already z-scored, average across all metros per week
        const sigKeys = ch.altMetroSignals;
        const weekSums = new Map<string, { sum: number; count: number }>();

        for (const sigKey of sigKeys) {
          // Get all metro signal series for this key
          const metroSeries = d.prepare(
            "SELECT id FROM series WHERE id LIKE ? AND scope = 'metro'"
          ).all(`metro_%_sig_${sigKey}`) as Array<{ id: string }>;

          const dirIdx = sigKeys.indexOf(sigKey);
          const dir = ch.altDirections[dirIdx];

          for (const { id } of metroSeries) {
            const pts = d.prepare("SELECT date, value FROM datapoints WHERE series_id = ? ORDER BY date")
              .all(id) as Array<{ date: string; value: number }>;
            for (const p of pts) {
              const entry = weekSums.get(p.date) ?? { sum: 0, count: 0 };
              entry.sum += p.value * dir;
              entry.count++;
              weekSums.set(p.date, entry);
            }
          }
        }

        for (const [date, { sum, count }] of weekSums) {
          altWeekly.set(date, sum / count);
        }
      }

      if (altWeekly.size < 20) { channels.push(emptyChannel(ch)); continue; }

      // ─── Load official benchmark ───
      const officialPts = d.prepare("SELECT date, value FROM datapoints WHERE series_id = ? ORDER BY date")
        .all(ch.officialSeriesId) as Array<{ date: string; value: number }>;

      if (officialPts.length < 5) { channels.push(emptyChannel(ch)); continue; }

      // Transform official data
      let officialValues: Array<{ date: string; value: number }> = [];
      if (ch.officialTransform === "yoy") {
        for (let i = 12; i < officialPts.length; i++) {
          const prev = officialPts[i - 12].value;
          if (prev !== 0) {
            officialValues.push({ date: officialPts[i].date, value: ((officialPts[i].value - prev) / Math.abs(prev)) * 100 });
          }
        }
      } else if (ch.officialTransform === "mom") {
        for (let i = 1; i < officialPts.length; i++) {
          officialValues.push({ date: officialPts[i].date, value: officialPts[i].value - officialPts[i - 1].value });
        }
      } else {
        officialValues = officialPts.map(p => ({ date: p.date, value: p.value }));
      }

      // Z-score official
      const offVals = officialValues.map(p => p.value);
      const offZ = zScore(offVals);
      const officialZMap = new Map<string, number>();
      officialValues.forEach((p, i) => officialZMap.set(p.date, offZ[i]));

      // ─── Align to common date range (last 104 weeks) ───
      const allDates = [...altWeekly.keys()].sort();
      const recentDates = allDates.slice(-104);

      const data: ChannelTimeseriesPoint[] = [];
      for (const date of recentDates) {
        const altVal = altWeekly.get(date) ?? null;
        // Find nearest official reading (within 7 days)
        let officialVal: number | null = null;
        for (const [offDate, offVal] of officialZMap) {
          const diff = Math.abs(new Date(date).getTime() - new Date(offDate).getTime());
          if (diff < 7 * 86400000) { officialVal = offVal; break; }
        }
        data.push({ date, alt: altVal !== null ? Math.round(altVal * 1000) / 1000 : null, official: officialVal !== null ? Math.round(officialVal * 1000) / 1000 : null, prediction: null, predLower: null, predUpper: null });
      }

      // ─── Linear regression prediction ───
      // Train: alt[t] → official[t + lag]
      const trainX: number[] = [];
      const trainY: number[] = [];
      for (let i = 0; i < data.length - PREDICTION_LAG; i++) {
        const x = data[i].alt;
        const y = data[i + PREDICTION_LAG]?.official;
        if (x !== null && y !== null) {
          trainX.push(x);
          trainY.push(y);
        }
      }

      const reg = linearRegression(trainX, trainY);
      const currentAlt = data.slice(-4).reduce((s, p) => s + (p.alt ?? 0), 0) / 4;

      // Generate prediction points
      const lastDate = new Date(recentDates[recentDates.length - 1] + "T00:00:00");
      for (let w = 1; w <= PREDICTION_HORIZON; w++) {
        const futureDate = new Date(lastDate);
        futureDate.setDate(lastDate.getDate() + w * 7);
        const dateStr = futureDate.toISOString().split("T")[0];
        const predicted = reg.slope * currentAlt + reg.intercept;
        const uncertainty = reg.residualStd * 1.96 * (w / PREDICTION_HORIZON) * 0.5;

        data.push({
          date: dateStr,
          alt: null,
          official: null,
          prediction: reg.rSquared >= 0.02 ? Math.round(predicted * 1000) / 1000 : null,
          predLower: reg.rSquared >= 0.02 ? Math.round((predicted - uncertainty) * 1000) / 1000 : null,
          predUpper: reg.rSquared >= 0.02 ? Math.round((predicted + uncertainty) * 1000) / 1000 : null,
        });
      }

      // Determine prediction direction
      const lastOfficialZ = [...officialZMap.values()].pop() ?? 0;
      const predictedZ = reg.slope * currentAlt + reg.intercept;
      const direction = predictedZ > lastOfficialZ + 0.1 ? "improving" : predictedZ < lastOfficialZ - 0.1 ? "worsening" : "stable";

      channels.push({
        key: ch.key,
        name: ch.name,
        color: ch.color,
        altLabel: ch.altLabel,
        officialLabel: ch.officialLabel,
        insight: generateInsight(ch.key, direction, reg.rSquared, currentAlt),
        rSquared: reg.rSquared,
        predictionDirection: direction as "improving" | "worsening" | "stable",
        data,
      });
    } catch (e) {
      channels.push(emptyChannel(ch));
    }
  }

  return channels;
}

function emptyChannel(ch: typeof CHANNEL_DEFS[number]): ChannelTimeseries {
  return { key: ch.key, name: ch.name, color: ch.color, altLabel: ch.altLabel, officialLabel: ch.officialLabel, insight: "Insufficient data", rSquared: 0, predictionDirection: "stable", data: [] };
}

function generateInsight(key: string, direction: string, r2: number, currentZ: number): string {
  const strength = r2 > 0.15 ? "strong" : r2 > 0.05 ? "moderate" : "weak";
  const zDesc = currentZ > 0.5 ? "above average" : currentZ < -0.5 ? "below average" : "near average";
  const dir = direction === "improving" ? "improvement" : direction === "worsening" ? "deterioration" : "stability";
  const insights: Record<string, string> = {
    labor: `Alt signals are ${zDesc}. ${strength === "weak" ? "Prediction unreliable" : `${strength} signal pointing to ${dir} in official employment data`}.`,
    cost: `Cost pressure is ${zDesc}. ${strength === "weak" ? "CPI prediction uncertain" : `${strength} evidence of ${dir} in inflation readings`}.`,
    confidence: `Behavioral confidence is ${zDesc}. ${strength === "weak" ? "Sentiment prediction uncertain" : `${strength} signal suggesting ${dir} in survey-based sentiment`}.`,
    financial: `Financial stress is ${zDesc}. ${strength === "weak" ? "Conditions prediction uncertain" : `${strength} signal of ${dir} in financial conditions`}.`,
    housing: `Housing market signals are ${zDesc}. ${strength === "weak" ? "Price prediction uncertain" : `${strength} evidence of ${dir} in home price trends`}.`,
  };
  return insights[key] ?? "";
}

// ─── Exports ───

export const METROS = loadMetrosFromDb();
export const NATIONAL_SUMMARY = loadNationalSummary(METROS);
export const CHANNEL_TIMESERIES = loadChannelTimeseries();
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
