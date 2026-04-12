"""
Index computation pipeline.

Reads raw source data from output/*.json, normalizes each signal to Z-scores,
computes the weighted composite, and exports a single dashboard.json consumed by Next.js.

Can work with partial data — if a source file is missing, that signal gets
zero weight and the remaining signals are re-normalized.
"""

import json
import sys
from datetime import datetime, timedelta
from pathlib import Path
from statistics import mean, stdev

sys.path.insert(0, str(Path(__file__).parent))
from config import METROS, OUTPUT_DIR

# Where Next.js reads from
DATA_DIR = Path(__file__).parent.parent / "src" / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
METROS_DIR = DATA_DIR / "metros"
METROS_DIR.mkdir(parents=True, exist_ok=True)
DASHBOARD_JSON = DATA_DIR / "dashboard.json"

SIGNAL_WEIGHTS = {
    "google_trends_anxiety": 0.18,  # Search behavior — purest vibes signal
    "unemployment_rate": 0.12,       # BLS metro unemployment
    "initial_claims": 0.12,          # FRED weekly jobless claims
    "housing_inventory": 0.12,       # Redfin active listings
    "housing_dom": 0.08,             # Redfin days on market
    "housing_price_drops": 0.08,     # Redfin % of listings with price cuts
    "new_biz_apps": 0.15,            # FRED weekly new business applications (state)
    "ai_job_ratio": 0.07,            # AI vs traditional job search ratio
    # Placeholder
    "small_biz_health": 0.08,
}


def load_json(name: str) -> dict | None:
    path = OUTPUT_DIR / f"{name}.json"
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return None


def z_score_series(values: list[float]) -> list[float]:
    """Convert a series to Z-scores. Returns 0s if not enough variance."""
    if len(values) < 3:
        return [0.0] * len(values)
    m = mean(values)
    s = stdev(values)
    if s < 0.001:
        return [0.0] * len(values)
    return [(v - m) / s for v in values]


def get_weekly_dates(weeks: int = 52) -> list[str]:
    """Generate the last N week-start dates (Mondays)."""
    today = datetime.now()
    # Find the most recent Monday
    days_since_monday = today.weekday()
    last_monday = today - timedelta(days=days_since_monday)
    dates = []
    for i in range(weeks - 1, -1, -1):
        d = last_monday - timedelta(weeks=i)
        dates.append(d.strftime("%Y-%m-%d"))
    return dates


def interpolate_monthly_to_weekly(monthly_data: list[dict], date_key: str, value_key: str, weeks: list[str]) -> list[float | None]:
    """Interpolate monthly data points to weekly resolution."""
    if not monthly_data:
        return [None] * len(weeks)

    # Build month -> value lookup
    month_vals = {}
    for item in monthly_data:
        month_vals[item[date_key]] = item[value_key]

    result = []
    for week_str in weeks:
        # Map week to month
        month_str = week_str[:7]  # "YYYY-MM"
        # Try this month, then previous month
        val = month_vals.get(month_str)
        if val is None:
            # Try previous month
            dt = datetime.strptime(week_str, "%Y-%m-%d")
            prev = (dt.replace(day=1) - timedelta(days=1)).strftime("%Y-%m")
            val = month_vals.get(prev)
        result.append(val)
    return result


def map_weekly_data(source_weeks: list[dict], date_key: str, value_key: str, target_weeks: list[str]) -> list[float | None]:
    """Map source weekly data to target week dates (nearest match)."""
    if not source_weeks:
        return [None] * len(target_weeks)

    # Build lookup
    week_vals = {item[date_key]: item[value_key] for item in source_weeks if value_key in item}

    result = []
    for tw in target_weeks:
        # Try exact match first
        val = week_vals.get(tw)
        if val is not None:
            result.append(val)
            continue
        # Find nearest date within 7 days
        target_dt = datetime.strptime(tw, "%Y-%m-%d")
        best_val = None
        best_dist = 999
        for sw_str, sv in week_vals.items():
            try:
                sw_dt = datetime.strptime(sw_str, "%Y-%m-%d")
                dist = abs((target_dt - sw_dt).days)
                if dist < best_dist and dist <= 7:
                    best_dist = dist
                    best_val = sv
            except ValueError:
                continue
        result.append(best_val)
    return result


def compute_metro_index(metro_id: str, weeks: list[str],
                        trends_data: dict | None,
                        bls_data: dict | None,
                        fred_data: dict | None,
                        redfin_data: dict | None,
                        expanded_data: dict | None = None,
                        ai_data: dict | None = None,
                        cpi_data: dict | None = None,
                        macro_data: dict | None = None) -> dict | None:
    """Compute the composite index for a single metro."""
    metro = next((m for m in METROS if m.id == metro_id), None)
    if not metro:
        return None

    n_weeks = len(weeks)
    signals = {}
    available_weights = {}

    # --- Google Trends Anxiety ---
    if trends_data and metro_id in trends_data:
        trend_weeks = trends_data[metro_id].get("weeks", [])
        anxiety_values = map_weekly_data(trend_weeks, "week", "anxiety_ratio", weeks)
        if any(v is not None for v in anxiety_values):
            filled = fill_forward(anxiety_values)
            # Invert: higher anxiety = worse = lower score
            inverted = [1.0 - v if v is not None else None for v in filled]
            signals["google_trends_anxiety"] = inverted
            available_weights["google_trends_anxiety"] = SIGNAL_WEIGHTS["google_trends_anxiety"]

    # --- BLS Unemployment Rate ---
    if bls_data and metro_id in bls_data:
        bls_months = bls_data[metro_id].get("months", [])
        unemp_values = interpolate_monthly_to_weekly(bls_months, "month", "unemployment_rate", weeks)
        if any(v is not None for v in unemp_values):
            filled = fill_forward(unemp_values)
            # Invert: higher unemployment = worse
            inverted = [-v if v is not None else None for v in filled]
            signals["unemployment_rate"] = inverted
            available_weights["unemployment_rate"] = SIGNAL_WEIGHTS["unemployment_rate"]

    # --- FRED Initial Claims ---
    if fred_data and metro_id in fred_data:
        fred_weeks = fred_data[metro_id].get("weeks", [])
        claims_values = map_weekly_data(fred_weeks, "week", "initial_claims", weeks)
        if any(v is not None for v in claims_values):
            filled = fill_forward(claims_values)
            # Invert: higher claims = worse
            inverted = [-v if v is not None else None for v in filled]
            signals["initial_claims"] = inverted
            available_weights["initial_claims"] = SIGNAL_WEIGHTS["initial_claims"]

    # --- Redfin Housing Inventory ---
    if redfin_data and metro_id in redfin_data:
        redfin_weeks = redfin_data[metro_id].get("weeks", [])

        # Inventory (higher = more supply = market softening, but we treat it as neutral-to-positive
        # since it means more choice for buyers — Z-score handles relative change)
        inv_values = map_weekly_data(redfin_weeks, "week", "inventory", weeks)
        if any(v is not None for v in inv_values):
            filled = fill_forward(inv_values)
            # Invert: rising inventory suggests weakening demand
            inverted = [-v if v is not None else None for v in filled]
            signals["housing_inventory"] = inverted
            available_weights["housing_inventory"] = SIGNAL_WEIGHTS["housing_inventory"]

        # Days on Market (higher = slower market = worse sentiment)
        dom_values = map_weekly_data(redfin_weeks, "week", "median_dom", weeks)
        if any(v is not None for v in dom_values):
            filled = fill_forward(dom_values)
            # Invert: higher DOM = worse
            inverted = [-v if v is not None else None for v in filled]
            signals["housing_dom"] = inverted
            available_weights["housing_dom"] = SIGNAL_WEIGHTS["housing_dom"]

        # Price Drops (higher % = more sellers cutting prices = worse)
        pd_values = map_weekly_data(redfin_weeks, "week", "price_drops", weeks)
        if any(v is not None for v in pd_values):
            filled = fill_forward(pd_values)
            # Invert: more price drops = worse
            inverted = [-v if v is not None else None for v in filled]
            signals["housing_price_drops"] = inverted
            available_weights["housing_price_drops"] = SIGNAL_WEIGHTS["housing_price_drops"]

    # --- New Business Applications (state-level, weekly) ---
    if expanded_data and "metroStateData" in expanded_data and metro_id in expanded_data["metroStateData"]:
        biz_pts = expanded_data["metroStateData"][metro_id].get("bizApps", [])
        biz_values = map_weekly_data(biz_pts, "date", "value", weeks)
        if any(v is not None for v in biz_values):
            filled = fill_forward(biz_values)
            # Higher biz apps = more entrepreneurial confidence = positive
            signals["new_biz_apps"] = filled
            available_weights["new_biz_apps"] = SIGNAL_WEIGHTS["new_biz_apps"]

    # --- AI Job Search Ratio ---
    if ai_data and metro_id in ai_data:
        ai_weeks = ai_data[metro_id].get("weeks", [])
        ai_values = map_weekly_data(ai_weeks, "week", "ai_ratio", weeks)
        if any(v is not None for v in ai_values):
            filled = fill_forward(ai_values)
            # Higher AI ratio = labor market pivoting toward AI (neutral signal,
            # but momentum matters — we track the level and let z-score capture change)
            signals["ai_job_ratio"] = filled
            available_weights["ai_job_ratio"] = SIGNAL_WEIGHTS["ai_job_ratio"]

    if not signals:
        return None

    # Re-normalize weights to sum to 1.0
    total_weight = sum(available_weights.values())
    norm_weights = {k: v / total_weight for k, v in available_weights.items()}

    # Z-score each signal
    z_scored = {}
    for sig_name, values in signals.items():
        numeric = [v for v in values if v is not None]
        if len(numeric) < 3:
            z_scored[sig_name] = [0.0] * n_weeks
            continue
        m = mean(numeric)
        s = stdev(numeric) if len(numeric) > 1 else 1.0
        if s < 0.0001:
            s = 1.0
        z_scored[sig_name] = [(v - m) / s if v is not None else 0.0 for v in values]

    # Compute weighted composite per week
    history = []
    for w_idx, week_str in enumerate(weeks):
        weighted_sum = 0.0
        for sig_name, z_values in z_scored.items():
            weighted_sum += z_values[w_idx] * norm_weights[sig_name]

        # Convert z-score to 0-100 scale (z of -3 = 0, z of +3 = 100)
        composite = max(0, min(100, round((weighted_sum + 3) / 6 * 100)))

        sig_snapshot = {}
        for sig_name in z_scored:
            sig_snapshot[sig_name] = round(z_scored[sig_name][w_idx], 3)

        history.append({
            "week": week_str,
            "compositeScore": composite,
            "officialIndex": 50,  # placeholder, computed below
            "vibesGap": 0,
            "signals": sig_snapshot,
        })

    # --- Compute Official Index (government data composite) ---
    # Uses: unemployment rate, initial claims, CPI inflation, biz apps, coincident index
    # These are "what the government data says" vs our behavioral index
    official_signals: dict[str, list[float | None]] = {}
    official_weights: dict[str, float] = {}

    # Unemployment rate (inverted — lower is better)
    if "unemployment_rate" in signals:
        official_signals["unemp"] = signals["unemployment_rate"]  # already inverted
        official_weights["unemp"] = 0.30

    # Initial claims (inverted — lower is better)
    if "initial_claims" in signals:
        official_signals["claims"] = signals["initial_claims"]  # already inverted
        official_weights["claims"] = 0.20

    # CPI inflation (from metro CPI data — inverted, high inflation = bad)
    if cpi_data and metro_id in cpi_data:
        cpi_months = cpi_data[metro_id].get("points", [])
        cpi_values = interpolate_monthly_to_weekly(
            [p for p in cpi_months if "inflation_yoy" in p],
            "month", "inflation_yoy", weeks
        )
        if any(v is not None for v in cpi_values):
            filled = fill_forward(cpi_values)
            inverted = [-v if v is not None else None for v in filled]
            official_signals["cpi"] = inverted
            official_weights["cpi"] = 0.20

    # New business applications (higher = better)
    if "new_biz_apps" in signals:
        official_signals["biz"] = signals["new_biz_apps"]
        official_weights["biz"] = 0.15

    # National GDP growth (from macro data, if available)
    if macro_data and "gdp_growth" in macro_data:
        gdp_points = macro_data["gdp_growth"].get("points", [])
        gdp_values = interpolate_monthly_to_weekly(gdp_points, "date", "value", weeks)
        if any(v is not None for v in gdp_values):
            filled = fill_forward(gdp_values)
            official_signals["gdp"] = filled
            official_weights["gdp"] = 0.15

    # Compute official composite
    if official_signals:
        # Renormalize weights
        total_ow = sum(official_weights.values())
        norm_ow = {k: v / total_ow for k, v in official_weights.items()}

        # Z-score each official signal
        official_z: dict[str, list[float]] = {}
        for sig_name, values in official_signals.items():
            numeric = [v for v in values if v is not None]
            if len(numeric) < 3:
                official_z[sig_name] = [0.0] * n_weeks
                continue
            m = mean(numeric)
            s = stdev(numeric) if len(numeric) > 1 else 1.0
            if s < 0.0001:
                s = 1.0
            official_z[sig_name] = [(v - m) / s if v is not None else 0.0 for v in values]

        for w_idx in range(n_weeks):
            off_sum = sum(official_z[sig][w_idx] * norm_ow[sig] for sig in official_z)
            official_score = max(0, min(100, round((off_sum + 3) / 6 * 100)))
            history[w_idx]["officialIndex"] = official_score
            history[w_idx]["vibesGap"] = history[w_idx]["compositeScore"] - official_score

    quarterly = compute_quarterly_benchmarks(history)
    quarterly_signals = compute_quarterly_signal_averages(history)
    drivers = compute_sentiment_drivers(history, norm_weights)

    return {
        "id": metro.id,
        "name": metro.name,
        "state": metro.state,
        "population": metro.population,
        "signalsAvailable": list(signals.keys()),
        "signalWeights": {k: round(v, 3) for k, v in norm_weights.items()},
        "history": history,
        "quarterly": quarterly,
        "quarterlySignals": quarterly_signals,
        "sentimentDrivers": drivers,
    }


def fill_forward(values: list) -> list:
    """Fill None values with the last known non-None value."""
    result = []
    last = None
    for v in values:
        if v is not None:
            last = v
        result.append(last)
    return result


def week_to_quarter(week_str: str) -> str:
    """Convert 'YYYY-MM-DD' to 'YYYY-Q1' etc."""
    month = int(week_str[5:7])
    year = week_str[:4]
    q = (month - 1) // 3 + 1
    return f"{year}-Q{q}"


def compute_quarterly_benchmarks(history: list[dict]) -> list[dict]:
    """Compute quarterly averages from weekly history."""
    quarters: dict[str, list[int]] = {}
    for h in history:
        q = week_to_quarter(h["week"])
        if q not in quarters:
            quarters[q] = []
        quarters[q].append(h["compositeScore"])

    result = []
    sorted_qs = sorted(quarters.keys())
    for i, q in enumerate(sorted_qs):
        scores = quarters[q]
        avg = round(sum(scores) / len(scores), 1)
        qoq_change = None
        if i > 0:
            prev_scores = quarters[sorted_qs[i - 1]]
            prev_avg = sum(prev_scores) / len(prev_scores)
            qoq_change = round(avg - prev_avg, 1)
        result.append({
            "quarter": q,
            "avgScore": avg,
            "weeksInQuarter": len(scores),
            "high": max(scores),
            "low": min(scores),
            "qoqChange": qoq_change,
        })
    return result


def compute_quarterly_signal_averages(history: list[dict]) -> dict[str, list[dict]]:
    """Compute quarterly averages per signal for driver analysis."""
    quarters: dict[str, dict[str, list[float]]] = {}
    for h in history:
        q = week_to_quarter(h["week"])
        if q not in quarters:
            quarters[q] = {}
        for sig_name, z_val in h["signals"].items():
            if sig_name not in quarters[q]:
                quarters[q][sig_name] = []
            quarters[q][sig_name].append(z_val)

    result = {}
    sorted_qs = sorted(quarters.keys())
    for sig_name in set(k for qdata in quarters.values() for k in qdata):
        sig_quarters = []
        for i, q in enumerate(sorted_qs):
            values = quarters[q].get(sig_name, [])
            if not values:
                continue
            avg_z = round(sum(values) / len(values), 3)
            qoq = None
            if i > 0:
                prev_vals = quarters[sorted_qs[i - 1]].get(sig_name, [])
                if prev_vals:
                    prev_avg = sum(prev_vals) / len(prev_vals)
                    qoq = round(avg_z - prev_avg, 3)
            sig_quarters.append({
                "quarter": q,
                "avgZScore": avg_z,
                "qoqChange": qoq,
            })
        result[sig_name] = sig_quarters
    return result


def compute_sentiment_drivers(history: list[dict], signal_weights: dict[str, float]) -> dict:
    """
    Identify which signals are driving sentiment up or down.
    Compares the latest 4 weeks vs the prior 4 weeks.
    Returns ranked list of drivers with their contribution to the change.
    """
    if len(history) < 8:
        return {"drivers": [], "periodChange": 0}

    recent = history[-4:]
    prior = history[-8:-4]

    # Compute average z-score per signal for each period
    def avg_signals(period: list[dict]) -> dict[str, float]:
        sums: dict[str, float] = {}
        counts: dict[str, int] = {}
        for h in period:
            for sig, val in h["signals"].items():
                sums[sig] = sums.get(sig, 0) + val
                counts[sig] = counts.get(sig, 0) + 1
        return {sig: sums[sig] / counts[sig] for sig in sums}

    recent_avg = avg_signals(recent)
    prior_avg = avg_signals(prior)

    # Compute weighted contribution of each signal to the overall change
    drivers = []
    total_composite_change = 0
    for sig_name in recent_avg:
        if sig_name not in prior_avg:
            continue
        z_change = recent_avg[sig_name] - prior_avg[sig_name]
        weight = signal_weights.get(sig_name, 0)
        # Contribution to composite (in z-score terms, weighted)
        contribution = z_change * weight
        # Convert to approximate score-point impact (z of 1 ≈ 16.67 score points)
        score_impact = round(contribution * (100 / 6), 1)
        total_composite_change += score_impact
        drivers.append({
            "signal": sig_name,
            "zScoreChange": round(z_change, 3),
            "weight": round(weight, 3),
            "scoreImpact": score_impact,
            "direction": "up" if score_impact > 0 else "down" if score_impact < 0 else "flat",
            "currentZScore": round(recent_avg[sig_name], 3),
        })

    # Sort by absolute impact (biggest movers first)
    drivers.sort(key=lambda d: abs(d["scoreImpact"]), reverse=True)

    # Period composite change
    recent_composite = sum(h["compositeScore"] for h in recent) / len(recent)
    prior_composite = sum(h["compositeScore"] for h in prior) / len(prior)

    return {
        "drivers": drivers,
        "periodChange": round(recent_composite - prior_composite, 1),
        "recentAvg": round(recent_composite, 1),
        "priorAvg": round(prior_composite, 1),
    }


def main():
    print("=== Index Computation Pipeline ===")

    # Load source data (index signals + official index inputs)
    trends_data = load_json("google_trends")
    bls_data = load_json("bls_unemployment")
    fred_data = load_json("fred_claims")
    redfin_data = load_json("redfin_housing")
    expanded_data = load_json("fred_expanded")
    ai_data = load_json("ai_impact")
    cpi_data = load_json("bls_cpi_metro")
    macro_data = load_json("fred_macro")

    sources_available = []
    if trends_data:
        sources_available.append("google_trends")
    if bls_data:
        sources_available.append("bls_unemployment")
    if redfin_data:
        sources_available.append("redfin_housing")
    if fred_data:
        sources_available.append("fred_claims")
    if expanded_data:
        sources_available.append("fred_expanded")
    if ai_data:
        sources_available.append("ai_impact")

    print(f"Sources available: {sources_available or 'NONE'}")
    if not sources_available:
        print("ERROR: No source data found in output/. Run the source pipelines first.")
        print("  python pipelines/sources/google_trends.py")
        print("  python pipelines/sources/bls_unemployment.py")
        print("  python pipelines/sources/fred_claims.py")
        sys.exit(1)

    weeks = get_weekly_dates(260)  # 2 full years
    print(f"Computing index for {len(weeks)} weeks ({weeks[0]} to {weeks[-1]})")

    metros_output = []
    for metro in METROS:
        print(f"  {metro.name}...", end=" ")
        result = compute_metro_index(metro.id, weeks, trends_data, bls_data, fred_data, redfin_data, expanded_data, ai_data, cpi_data, macro_data)
        if result:
            metros_output.append(result)
            print(f"OK ({len(result['signalsAvailable'])} signals)")
        else:
            print("SKIP (no data)")

    # Compute national-level aggregates by averaging across metros
    national_history = []
    for w_idx in range(len(weeks)):
        composites = []
        officials = []
        sig_sums: dict[str, list[float]] = {}
        for m in metros_output:
            if w_idx < len(m["history"]):
                h = m["history"][w_idx]
                composites.append(h["compositeScore"])
                officials.append(h["officialIndex"])
                for sig, val in h["signals"].items():
                    if sig not in sig_sums:
                        sig_sums[sig] = []
                    sig_sums[sig].append(val)
        if composites:
            avg_composite = round(mean(composites))
            avg_official = round(mean(officials))
            avg_signals = {sig: round(mean(vals), 3) for sig, vals in sig_sums.items()}
            national_history.append({
                "week": weeks[w_idx],
                "compositeScore": avg_composite,
                "officialIndex": avg_official,
                "vibesGap": avg_composite - avg_official,
                "signals": avg_signals,
            })

    # Compute national average signal weights (average across metros)
    all_weights: dict[str, list[float]] = {}
    for m in metros_output:
        for sig, w in m["signalWeights"].items():
            if sig not in all_weights:
                all_weights[sig] = []
            all_weights[sig].append(w)
    avg_weights = {sig: round(mean(vals), 3) for sig, vals in all_weights.items()}

    national_quarterly = compute_quarterly_benchmarks(national_history)
    national_quarterly_signals = compute_quarterly_signal_averages(national_history)
    national_drivers = compute_sentiment_drivers(national_history, avg_weights)

    latest_scores = [m["history"][-1]["compositeScore"] for m in metros_output if m["history"]]
    summary = {
        "generatedAt": datetime.now().isoformat(),
        "sourcesUsed": sources_available,
        "weekRange": {"start": weeks[0], "end": weeks[-1]},
        "metroCount": len(metros_output),
        "nationalAverage": round(mean(latest_scores), 1) if latest_scores else 0,
        "nationalQuarterly": national_quarterly,
        "nationalQuarterlySignals": national_quarterly_signals,
        "nationalDrivers": national_drivers,
    }

    # Load additional contextual data (macro indicators, CPI, gas, zillow)
    macro_data = load_json("fred_macro")
    cpi_data = load_json("bls_cpi_metro")
    gas_data = load_json("eia_gas")
    zillow_data = load_json("zillow_zhvi")
    affordability_data = load_json("affordability")
    # expanded_data and ai_data already loaded above for index signals

    context_sources = []
    if macro_data:
        context_sources.append("fred_macro")
    if cpi_data:
        context_sources.append("bls_cpi_metro")
    if gas_data:
        context_sources.append("eia_gas")
    if ai_data:
        context_sources.append("ai_impact")
    if expanded_data:
        context_sources.append("fred_expanded")
    if zillow_data:
        context_sources.append("zillow_zhvi")
    print(f"Context sources: {context_sources}")

    # Attach metro-level context (CPI, gas, AI)
    for m in metros_output:
        metro_context = {}
        if cpi_data and m["id"] in cpi_data:
            points = cpi_data[m["id"]].get("points", [])
            if points:
                latest = points[-1]
                metro_context["cpi"] = {
                    "latestMonth": latest.get("month"),
                    "indexValue": latest.get("cpi_index"),
                    "inflationYoY": latest.get("inflation_yoy"),
                }
        if gas_data and "metros" in gas_data and m["id"] in gas_data["metros"]:
            gas_points = gas_data["metros"][m["id"]].get("points", [])
            if gas_points:
                latest = gas_points[-1]
                metro_context["gas"] = {
                    "latestWeek": latest.get("week"),
                    "price": latest.get("price"),
                    "region": gas_data["metros"][m["id"]].get("region"),
                }
        if ai_data and m["id"] in ai_data:
            ai_metro = ai_data[m["id"]]
            metro_context["ai"] = {
                "latestAiRatio": ai_metro.get("latestAiRatio"),
                "aiMomentum": ai_metro.get("aiMomentum"),
            }
        if zillow_data and m["id"] in zillow_data:
            z_points = zillow_data[m["id"]].get("points", [])
            if z_points:
                latest = z_points[-1]
                metro_context["homeValue"] = {
                    "latestMonth": latest.get("month"),
                    "zhvi": latest.get("zhvi"),
                    "yoyPct": latest.get("yoy_pct"),
                }
        if expanded_data and "metroStateData" in expanded_data and m["id"] in expanded_data["metroStateData"]:
            state_data = expanded_data["metroStateData"][m["id"]]
            biz_pts = state_data.get("bizApps", [])
            if biz_pts:
                latest = biz_pts[-1]
                prev_4wk = biz_pts[-5] if len(biz_pts) >= 5 else None
                metro_context["bizApps"] = {
                    "latestWeek": latest.get("date"),
                    "value": latest.get("value"),
                    "change4wk": round(latest["value"] - prev_4wk["value"], 1) if prev_4wk else None,
                }
            coin_pts = state_data.get("coincidentIndex", [])
            if coin_pts:
                latest = coin_pts[-1]
                metro_context["coincidentIndex"] = {
                    "latestMonth": latest.get("date"),
                    "value": latest.get("value"),
                }
        if affordability_data and m["id"] in affordability_data:
            aff = affordability_data[m["id"]]
            metro_context["affordability"] = {
                "score": aff.get("affordabilityScore"),
                "income": aff.get("income"),
                "homePrice": aff.get("homePrice"),
                "monthlyMortgage": aff.get("monthlyMortgage"),
                "housingBurden": aff.get("housingBurden"),
                "homeAppreciation": aff.get("homeAppreciation"),
            }
        m["context"] = metro_context

    # --- Write per-metro files (for metro detail pages) ---
    # Build lightweight metro summaries for the overview (no full history)
    metro_summaries = []
    for m in metros_output:
        h = m["history"]
        current = h[-1] if h else {}
        previous = h[-2] if len(h) > 1 else current

        # Write full metro data to individual file
        with open(METROS_DIR / f"{m['id']}.json", "w") as f:
            json.dump(m, f)

        # Build lightweight summary for overview
        # Include only last 26 weeks of history for sparklines
        metro_summaries.append({
            "id": m["id"],
            "name": m["name"],
            "state": m["state"],
            "population": m["population"],
            "currentScore": current.get("compositeScore", 50),
            "previousScore": previous.get("compositeScore", 50),
            "weekOverWeekChange": current.get("compositeScore", 50) - previous.get("compositeScore", 50),
            "vibesGap": current.get("vibesGap", 0),
            "trend": m.get("trend", "stable") if "trend" in m else ("improving" if current.get("compositeScore", 50) > previous.get("compositeScore", 50) else "declining" if current.get("compositeScore", 50) < previous.get("compositeScore", 50) else "stable"),
            "signalsAvailable": m.get("signalsAvailable", []),
            "quarterly": m.get("quarterly", []),
            "sentimentDrivers": m.get("sentimentDrivers", {}),
            "context": m.get("context", {}),
            "sparkHistory": [{"week": w["week"], "compositeScore": w["compositeScore"]} for w in h[-26:]],
        })

    print(f"  Wrote {len(metros_output)} per-metro files to {METROS_DIR}/")

    # --- Write main dashboard (lightweight for overview) ---
    dashboard = {
        "summary": summary,
        "metros": metro_summaries,  # lightweight summaries
        "macro": macro_data or {},
        "expanded": expanded_data.get("national", {}) if expanded_data else {},
        "nationalCpi": cpi_data.get("_national", {}) if cpi_data else {},
        "gasNational": gas_data.get("regions", {}).get("national", {}) if gas_data else {},
        "affordability": affordability_data or {},
    }

    with open(DASHBOARD_JSON, "w") as f:
        json.dump(dashboard, f)  # no indent — smaller file
    size_kb = DASHBOARD_JSON.stat().st_size / 1024
    print(f"\nDashboard summary saved to {DASHBOARD_JSON} ({size_kb:.0f} KB)")

    # Also write full dashboard for backwards compat during transition
    full_dashboard = {
        "summary": summary,
        "metros": metros_output,
        "macro": macro_data or {},
        "expanded": expanded_data.get("national", {}) if expanded_data else {},
        "nationalCpi": cpi_data.get("_national", {}) if cpi_data else {},
        "gasNational": gas_data.get("regions", {}).get("national", {}) if gas_data else {},
        "affordability": affordability_data or {},
    }
    with open(DATA_DIR / "dashboard_full.json", "w") as f:
        json.dump(full_dashboard, f)

    print(f"Metros: {len(metros_output)}, Index sources: {sources_available}, Context sources: {context_sources}")


if __name__ == "__main__":
    main()
