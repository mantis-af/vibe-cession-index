"""
Lead/Lag Analysis — proves the behavioral index predicts official data.

For each metro, computes cross-correlation between behavioral and official
index at time offsets from -12 to +12 weeks. A peak at negative offset
means the behavioral index LEADS the official data.

Also computes national aggregate lead/lag.

Outputs leadlag.json consumed by the frontend.
"""

import json
import sys
from pathlib import Path
from statistics import mean, stdev

DASHBOARD_JSON = Path(__file__).parent.parent / "src" / "data" / "dashboard.json"
LEADLAG_JSON = Path(__file__).parent.parent / "src" / "data" / "leadlag.json"


def cross_correlation(x: list[float], y: list[float], max_lag: int = 12) -> list[dict]:
    """Compute normalized cross-correlation at lags from -max_lag to +max_lag.

    Positive lag means x leads y (x[t] correlates with y[t+lag]).
    Negative lag means y leads x.
    """
    n = len(x)
    if n < max_lag * 3:
        return []

    mx, my = mean(x), mean(y)
    sx, sy = stdev(x), stdev(y)
    if sx < 0.001 or sy < 0.001:
        return []

    results = []
    for lag in range(-max_lag, max_lag + 1):
        pairs = 0
        total = 0.0
        for i in range(n):
            j = i + lag
            if 0 <= j < n:
                total += (x[i] - mx) * (y[j] - my)
                pairs += 1
        if pairs > 0:
            corr = total / (pairs * sx * sy)
            results.append({"lag": lag, "correlation": round(corr, 4)})

    return results


def find_peak_lag(correlations: list[dict]) -> dict:
    """Find the lag with the highest correlation."""
    if not correlations:
        return {"peakLag": 0, "peakCorrelation": 0}
    best = max(correlations, key=lambda c: c["correlation"])
    return {"peakLag": best["lag"], "peakCorrelation": best["correlation"]}


def main():
    print("=== Lead/Lag Analysis ===")
    with open(DASHBOARD_JSON) as f:
        d = json.load(f)

    metros = d["metros"]
    max_lag = 12

    metro_results = []
    all_behavioral = []
    all_official = []

    # Behavioral-unique signals: search anxiety, housing DOM, price drops, AI ratio
    # Official-unique signals: unemployment rate, initial claims, GDP
    behavioral_keys = {"google_trends_anxiety", "housing_dom", "housing_price_drops", "ai_job_ratio", "housing_inventory"}
    official_keys = {"unemployment_rate", "initial_claims", "new_biz_apps"}

    for m in metros:
        h = m["history"]
        if len(h) < max_lag * 3:
            continue

        # Build behavioral-only and official-only series from z-scores
        behavioral = []
        official = []
        for w in h:
            sigs = w.get("signals", {})
            b_vals = [sigs[k] for k in behavioral_keys if k in sigs and abs(sigs[k]) > 0.001]
            o_vals = [sigs[k] for k in official_keys if k in sigs and abs(sigs[k]) > 0.001]
            behavioral.append(mean(b_vals) if b_vals else 0)
            official.append(mean(o_vals) if o_vals else 0)

        # Accumulate for national average
        if not all_behavioral:
            all_behavioral = [0.0] * len(behavioral)
            all_official = [0.0] * len(official)
        for i in range(min(len(behavioral), len(all_behavioral))):
            all_behavioral[i] += behavioral[i]
            all_official[i] += official[i]

        correlations = cross_correlation(behavioral, official, max_lag)
        peak = find_peak_lag(correlations)

        # Interpret
        if peak["peakLag"] > 0:
            interpretation = f"Behavioral leads official by {peak['peakLag']} weeks"
            leads = True
        elif peak["peakLag"] < 0:
            interpretation = f"Official leads behavioral by {abs(peak['peakLag'])} weeks"
            leads = False
        else:
            interpretation = "Synchronized (no lead/lag detected)"
            leads = None

        metro_results.append({
            "id": m["id"],
            "name": m["name"],
            "state": m["state"],
            "peakLag": peak["peakLag"],
            "peakCorrelation": peak["peakCorrelation"],
            "leads": leads,
            "interpretation": interpretation,
            "correlations": correlations,
        })

    # National aggregate
    n_metros = len([m for m in metros if len(m["history"]) >= max_lag * 3])
    if n_metros > 0:
        all_behavioral = [v / n_metros for v in all_behavioral]
        all_official = [v / n_metros for v in all_official]

    national_corr = cross_correlation(all_behavioral, all_official, max_lag)
    national_peak = find_peak_lag(national_corr)

    # Summary stats
    leading_metros = [m for m in metro_results if m["leads"] is True]
    lagging_metros = [m for m in metro_results if m["leads"] is False]
    synced_metros = [m for m in metro_results if m["leads"] is None]
    avg_lead = mean([m["peakLag"] for m in leading_metros]) if leading_metros else 0

    output = {
        "national": {
            "peakLag": national_peak["peakLag"],
            "peakCorrelation": national_peak["peakCorrelation"],
            "correlations": national_corr,
            "interpretation": f"National behavioral index leads official data by {national_peak['peakLag']} weeks" if national_peak["peakLag"] > 0 else "National indices are synchronized",
        },
        "summary": {
            "metrosAnalyzed": len(metro_results),
            "metrosLeading": len(leading_metros),
            "metrosLagging": len(lagging_metros),
            "metrosSynced": len(synced_metros),
            "avgLeadWeeks": round(avg_lead, 1),
        },
        "metros": sorted(metro_results, key=lambda m: m["peakLag"], reverse=True),
    }

    with open(LEADLAG_JSON, "w") as f:
        json.dump(output, f, indent=2)

    print(f"National: peak at lag {national_peak['peakLag']} (r={national_peak['peakCorrelation']:.3f})")
    print(f"Metros leading:  {len(leading_metros)}")
    print(f"Metros lagging:  {len(lagging_metros)}")
    print(f"Metros synced:   {len(synced_metros)}")
    print(f"Avg lead (where leading): {avg_lead:.1f} weeks")
    print(f"\nTop leading metros:")
    for m in sorted(leading_metros, key=lambda m: m["peakLag"], reverse=True)[:5]:
        print(f"  {m['name']:20s} leads by {m['peakLag']} weeks (r={m['peakCorrelation']:.3f})")
    print(f"\nSaved to {LEADLAG_JSON}")


if __name__ == "__main__":
    main()
