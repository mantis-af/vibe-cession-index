"""
Forecast engine — uses validated lead/lag relationships to project
where official economic indicators are heading.

Approach:
  For each validated leading pair (behavioral → official), we use the
  current behavioral signal value and the historical regression to
  project the official signal N weeks forward.

  Multiple leading signals are combined via weighted average of their
  projections, weighted by correlation strength.

Outputs forecast.json consumed by the frontend.
"""

import json
import sys
from datetime import datetime, timedelta
from pathlib import Path
from statistics import mean, stdev

import numpy as np
from scipy import stats as scipy_stats

DASHBOARD_JSON = Path(__file__).parent.parent / "src" / "data" / "dashboard.json"
DASHBOARD_FULL = Path(__file__).parent.parent / "src" / "data" / "dashboard_full.json"
LEADLAG_JSON = Path(__file__).parent.parent / "src" / "data" / "leadlag.json"
FORECAST_JSON = Path(__file__).parent.parent / "src" / "data" / "forecast.json"

# Use full dashboard for history
DATA_FILE = DASHBOARD_FULL if DASHBOARD_FULL.exists() else DASHBOARD_JSON


def load_national_signals(metros: list) -> dict[str, list[float]]:
    """Build national-average weekly signal time series."""
    n_weeks = min(len(m["history"]) for m in metros if len(m["history"]) > 30)
    signals: dict[str, list[list[float]]] = {}

    for m in metros:
        h = m["history"]
        if len(h) < n_weeks:
            continue
        for i in range(n_weeks):
            for sig, val in h[i].get("signals", {}).items():
                if sig not in signals:
                    signals[sig] = [[] for _ in range(n_weeks)]
                signals[sig][i].append(val)

    return {sig: [mean(week_vals) if week_vals else 0 for week_vals in weeks]
            for sig, weeks in signals.items()}


def build_regression(x_series: list[float], y_series: list[float], lag: int) -> dict | None:
    """Build a simple linear regression: y[t+lag] = a + b * x[t]."""
    n = len(x_series)
    if n < lag + 20:
        return None

    x_vals = []
    y_vals = []
    for i in range(n - lag):
        j = i + lag
        if j < n:
            x_vals.append(x_series[i])
            y_vals.append(y_series[j])

    if len(x_vals) < 20:
        return None

    x_arr = np.array(x_vals)
    y_arr = np.array(y_vals)

    slope, intercept, r, p, se = scipy_stats.linregress(x_arr, y_arr)

    return {
        "slope": float(slope),
        "intercept": float(intercept),
        "r_squared": float(r ** 2),
        "p_value": float(p),
        "std_error": float(se),
        "n_observations": len(x_vals),
    }


def project_signal(regression: dict, current_x: float, n_future: int, history_y: list[float]) -> list[dict]:
    """Project y values for the next n_future weeks given current x."""
    projected_y = regression["slope"] * current_x + regression["intercept"]

    # Compute confidence interval from residual std
    y_std = stdev(history_y[-52:]) if len(history_y) >= 52 else stdev(history_y) if len(history_y) > 2 else 1.0
    ci_mult = 1.96  # 95% CI

    results = []
    for w in range(1, n_future + 1):
        # Uncertainty grows with projection distance
        uncertainty = y_std * 0.3 * (w / n_future)
        results.append({
            "weeksAhead": w,
            "projected": round(projected_y, 3),
            "ciLower": round(projected_y - ci_mult * uncertainty, 3),
            "ciUpper": round(projected_y + ci_mult * uncertainty, 3),
        })

    return results


def main():
    print("=== Forecast Engine ===")

    with open(DATA_FILE) as f:
        dashboard = json.load(f)
    with open(LEADLAG_JSON) as f:
        leadlag = json.load(f)

    metros = dashboard["metros"]
    signal_pairs = leadlag.get("signalPairs", [])

    # Only use significant leading pairs
    leading_pairs = [p for p in signal_pairs if p["significant"] and p["peakLag"] > 0]
    print(f"Using {len(leading_pairs)} significant leading signal pairs")

    # Build national signal series
    national_signals = load_national_signals(metros)

    # Get the latest week date
    last_week = metros[0]["history"][-1]["week"] if metros and metros[0]["history"] else ""
    last_dt = datetime.strptime(last_week, "%Y-%m-%d") if last_week else datetime.now()

    # For each leading pair, build regression and project
    forecasts = []
    for pair in leading_pairs:
        b_key = pair["behavioral"]
        o_key = pair["official"]
        lag = pair["peakLag"]

        b_series = national_signals.get(b_key)
        o_series = national_signals.get(o_key)
        if not b_series or not o_series:
            continue

        reg = build_regression(b_series, o_series, lag)
        if not reg or reg["p_value"] > 0.05:
            continue

        # Current behavioral value (average of last 4 weeks for stability)
        current_b = mean(b_series[-4:])
        # Project forward
        projections = project_signal(reg, current_b, lag, o_series)

        # Also get recent trajectory of official signal
        recent_official = o_series[-8:] if len(o_series) >= 8 else o_series

        # Direction
        projected_val = projections[-1]["projected"] if projections else 0
        current_official = o_series[-1] if o_series else 0
        direction = "worsening" if projected_val < current_official else "improving" if projected_val > current_official else "stable"

        SIGNAL_NAMES = {
            "google_trends_anxiety": "Search Anxiety",
            "housing_dom": "Days on Market",
            "housing_price_drops": "Price Drops",
            "housing_inventory": "Housing Inventory",
            "unemployment_rate": "Unemployment Rate",
            "initial_claims": "Jobless Claims",
            "new_biz_apps": "New Business Apps",
        }

        forecasts.append({
            "behavioral": b_key,
            "official": o_key,
            "behavioralName": SIGNAL_NAMES.get(b_key, b_key),
            "officialName": SIGNAL_NAMES.get(o_key, o_key),
            "leadWeeks": lag,
            "correlation": pair["peakCorrelation"],
            "regression": reg,
            "currentBehavioral": round(current_b, 3),
            "currentOfficial": round(current_official, 3),
            "projectedOfficial": round(projected_val, 3),
            "direction": direction,
            "projections": projections,
            "narrative": (
                f"Based on current {SIGNAL_NAMES.get(b_key, b_key).lower()} levels, "
                f"{SIGNAL_NAMES.get(o_key, o_key).lower()} is projected to "
                f"{'deteriorate' if direction == 'worsening' else 'improve' if direction == 'improving' else 'hold steady'} "
                f"over the next {lag} weeks "
                f"(r²={reg['r_squared']:.2f}, p={reg['p_value']:.3f})."
            ),
        })

    # Generate future week dates
    future_weeks = []
    for w in range(1, 17):
        dt = last_dt + timedelta(weeks=w)
        future_weeks.append(dt.strftime("%Y-%m-%d"))

    # Build a composite forecast: weighted average of all projections per official signal
    composite = {}
    for f in forecasts:
        o_key = f["official"]
        if o_key not in composite:
            composite[o_key] = {
                "officialName": f["officialName"],
                "projections": {},
                "weights": [],
                "direction": [],
            }
        weight = abs(f["correlation"])
        composite[o_key]["weights"].append(weight)
        composite[o_key]["direction"].append(f["direction"])
        for p in f["projections"]:
            w = p["weeksAhead"]
            if w not in composite[o_key]["projections"]:
                composite[o_key]["projections"][w] = {"values": [], "weights": [], "ci_lower": [], "ci_upper": []}
            composite[o_key]["projections"][w]["values"].append(p["projected"])
            composite[o_key]["projections"][w]["weights"].append(weight)
            composite[o_key]["projections"][w]["ci_lower"].append(p["ciLower"])
            composite[o_key]["projections"][w]["ci_upper"].append(p["ciUpper"])

    composite_forecasts = []
    for o_key, data in composite.items():
        weeks_out = []
        for w in sorted(data["projections"].keys()):
            vals = data["projections"][w]["values"]
            wts = data["projections"][w]["weights"]
            ci_l = data["projections"][w]["ci_lower"]
            ci_u = data["projections"][w]["ci_upper"]
            total_w = sum(wts)
            weighted_val = sum(v * wt for v, wt in zip(vals, wts)) / total_w if total_w > 0 else 0
            weighted_lower = sum(v * wt for v, wt in zip(ci_l, wts)) / total_w if total_w > 0 else 0
            weighted_upper = sum(v * wt for v, wt in zip(ci_u, wts)) / total_w if total_w > 0 else 0
            weeks_out.append({
                "weeksAhead": w,
                "week": future_weeks[w - 1] if w <= len(future_weeks) else "",
                "projected": round(weighted_val, 3),
                "ciLower": round(weighted_lower, 3),
                "ciUpper": round(weighted_upper, 3),
            })

        directions = data["direction"]
        dominant = max(set(directions), key=directions.count)

        composite_forecasts.append({
            "official": o_key,
            "officialName": data["officialName"],
            "direction": dominant,
            "contributingSignals": len(data["weights"]),
            "projections": weeks_out,
        })

    output = {
        "generatedAt": datetime.now().isoformat(),
        "lastDataWeek": last_week,
        "forecastHorizon": "16 weeks",
        "signalForecasts": forecasts,
        "compositeForecasts": composite_forecasts,
    }

    with open(FORECAST_JSON, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nForecasts generated:")
    for cf in composite_forecasts:
        proj = cf["projections"][-1] if cf["projections"] else {}
        print(f"  {cf['officialName']:25s} → {cf['direction']:12s} ({cf['contributingSignals']} signals, "
              f"projected z={proj.get('projected', 0):+.3f} in {proj.get('weeksAhead', 0)}w)")
    print(f"\nSaved to {FORECAST_JSON}")


if __name__ == "__main__":
    main()
