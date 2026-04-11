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
DASHBOARD_JSON = Path(__file__).parent.parent / "src" / "data" / "dashboard.json"
DASHBOARD_JSON.parent.mkdir(parents=True, exist_ok=True)

SIGNAL_WEIGHTS = {
    "google_trends_anxiety": 0.20,
    "unemployment_rate": 0.15,
    "initial_claims": 0.15,
    "housing_inventory": 0.15,
    "housing_dom": 0.10,
    "housing_price_drops": 0.10,
    # Placeholders for future pipelines
    "job_postings": 0.10,
    "small_biz_health": 0.05,
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
    week_vals = {item[date_key]: item[value_key] for item in source_weeks}

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
                        redfin_data: dict | None) -> dict | None:
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

        # Official index: use raw unemployment rate (inverted, scaled)
        official = 50  # default
        if "unemployment_rate" in signals:
            unemp = signals["unemployment_rate"][w_idx]
            if unemp is not None:
                # Typical range 2-10%, map to 0-100 (lower = better)
                official = max(0, min(100, round(100 - (-unemp - 2) / 8 * 100)))

        sig_snapshot = {}
        for sig_name in z_scored:
            sig_snapshot[sig_name] = round(z_scored[sig_name][w_idx], 3)

        history.append({
            "week": week_str,
            "compositeScore": composite,
            "officialIndex": official,
            "vibesGap": composite - official,
            "signals": sig_snapshot,
        })

    return {
        "id": metro.id,
        "name": metro.name,
        "state": metro.state,
        "population": metro.population,
        "signalsAvailable": list(signals.keys()),
        "signalWeights": {k: round(v, 3) for k, v in norm_weights.items()},
        "history": history,
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


def main():
    print("=== Index Computation Pipeline ===")

    # Load source data
    trends_data = load_json("google_trends")
    bls_data = load_json("bls_unemployment")
    fred_data = load_json("fred_claims")
    redfin_data = load_json("redfin_housing")

    sources_available = []
    if trends_data:
        sources_available.append("google_trends")
    if bls_data:
        sources_available.append("bls_unemployment")
    if redfin_data:
        sources_available.append("redfin_housing")
    if fred_data:
        sources_available.append("fred_claims")

    print(f"Sources available: {sources_available or 'NONE'}")
    if not sources_available:
        print("ERROR: No source data found in output/. Run the source pipelines first.")
        print("  python pipelines/sources/google_trends.py")
        print("  python pipelines/sources/bls_unemployment.py")
        print("  python pipelines/sources/fred_claims.py")
        sys.exit(1)

    weeks = get_weekly_dates(52)
    print(f"Computing index for {len(weeks)} weeks ({weeks[0]} to {weeks[-1]})")

    metros_output = []
    for metro in METROS:
        print(f"  {metro.name}...", end=" ")
        result = compute_metro_index(metro.id, weeks, trends_data, bls_data, fred_data, redfin_data)
        if result:
            metros_output.append(result)
            print(f"OK ({len(result['signalsAvailable'])} signals)")
        else:
            print("SKIP (no data)")

    # Compute national summary
    latest_scores = [m["history"][-1]["compositeScore"] for m in metros_output if m["history"]]
    summary = {
        "generatedAt": datetime.now().isoformat(),
        "sourcesUsed": sources_available,
        "weekRange": {"start": weeks[0], "end": weeks[-1]},
        "metroCount": len(metros_output),
        "nationalAverage": round(mean(latest_scores), 1) if latest_scores else 0,
    }

    dashboard = {
        "summary": summary,
        "metros": metros_output,
    }

    with open(DASHBOARD_JSON, "w") as f:
        json.dump(dashboard, f, indent=2)
    print(f"\nDashboard data saved to {DASHBOARD_JSON}")
    print(f"Metros: {len(metros_output)}, Sources: {sources_available}")


if __name__ == "__main__":
    main()
