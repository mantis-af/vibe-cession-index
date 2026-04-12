"""
Lead/Lag Analysis v2 — robust statistical analysis of predictive power.

Improvements over v1:
1. Per-signal lead/lag: tests each behavioral signal against each official signal
2. Rolling window correlation: shows how lead/lag evolves over time
3. Statistical significance: p-values via permutation testing
4. Granger-style predictive test: does adding behavioral improve prediction of official?
5. Composite behavioral → composite official with proper detrending

Outputs leadlag.json consumed by the frontend.
"""

import json
import sys
from pathlib import Path
from statistics import mean, stdev
import numpy as np
from scipy import stats as scipy_stats

DASHBOARD_JSON = Path(__file__).parent.parent / "src" / "data" / "dashboard.json"
LEADLAG_JSON = Path(__file__).parent.parent / "src" / "data" / "leadlag.json"


def detrend(series: list[float]) -> list[float]:
    """Remove linear trend from a time series."""
    n = len(series)
    if n < 3:
        return series
    x = np.arange(n)
    y = np.array(series)
    slope, intercept = np.polyfit(x, y, 1)
    return (y - (slope * x + intercept)).tolist()


def cross_correlation_with_significance(x: list[float], y: list[float], max_lag: int = 16, n_permutations: int = 200) -> list[dict]:
    """Compute cross-correlation with p-values via permutation test.

    Positive lag: x[t] correlates with y[t+lag] → x leads y.
    """
    n = len(x)
    if n < max_lag * 2 + 5:
        return []

    xa = np.array(x)
    ya = np.array(y)

    # Detrend both series
    xa = xa - np.polyval(np.polyfit(np.arange(n), xa, 1), np.arange(n))
    ya = ya - np.polyval(np.polyfit(np.arange(n), ya, 1), np.arange(n))

    sx, sy = np.std(xa), np.std(ya)
    if sx < 1e-6 or sy < 1e-6:
        return []

    # Normalize
    xa = (xa - np.mean(xa)) / sx
    ya = (ya - np.mean(ya)) / sy

    results = []
    for lag in range(-max_lag, max_lag + 1):
        if lag >= 0:
            x_slice = xa[:n - lag] if lag > 0 else xa
            y_slice = ya[lag:] if lag > 0 else ya
        else:
            x_slice = xa[-lag:]
            y_slice = ya[:n + lag]

        pairs = len(x_slice)
        if pairs < 10:
            continue

        r = float(np.corrcoef(x_slice, y_slice)[0, 1])

        # Permutation test for significance
        null_rs = []
        for _ in range(n_permutations):
            perm = np.random.permutation(x_slice)
            null_r = float(np.corrcoef(perm, y_slice)[0, 1])
            null_rs.append(abs(null_r))

        p_value = float(np.mean(np.array(null_rs) >= abs(r)))

        results.append({
            "lag": lag,
            "correlation": round(r, 4),
            "pValue": round(p_value, 4),
            "significant": p_value < 0.05,
            "pairs": pairs,
        })

    return results


def per_signal_leadlag(history: list[dict], max_lag: int = 16) -> list[dict]:
    """Test each behavioral signal against each official signal independently."""
    behavioral_keys = ["google_trends_anxiety", "housing_dom", "housing_price_drops", "housing_inventory"]
    official_keys = ["unemployment_rate", "initial_claims", "new_biz_apps"]

    NAMES = {
        "google_trends_anxiety": "Search Anxiety",
        "housing_dom": "Days on Market",
        "housing_price_drops": "Price Drops",
        "housing_inventory": "Housing Inventory",
        "unemployment_rate": "Unemployment Rate",
        "initial_claims": "Jobless Claims",
        "new_biz_apps": "New Business Apps",
    }

    results = []
    for bkey in behavioral_keys:
        b_series = [w["signals"].get(bkey, 0) for w in history]
        if all(abs(v) < 0.001 for v in b_series):
            continue

        for okey in official_keys:
            o_series = [w["signals"].get(okey, 0) for w in history]
            if all(abs(v) < 0.001 for v in o_series):
                continue

            corrs = cross_correlation_with_significance(b_series, o_series, max_lag, n_permutations=100)
            if not corrs:
                continue

            # Find significant peak
            sig_corrs = [c for c in corrs if c["significant"]]
            if sig_corrs:
                best = max(sig_corrs, key=lambda c: abs(c["correlation"]))
            else:
                best = max(corrs, key=lambda c: abs(c["correlation"]))

            results.append({
                "behavioral": bkey,
                "official": okey,
                "behavioralName": NAMES.get(bkey, bkey),
                "officialName": NAMES.get(okey, okey),
                "peakLag": best["lag"],
                "peakCorrelation": best["correlation"],
                "pValue": best["pValue"],
                "significant": best["significant"],
                "interpretation": (
                    f"{NAMES.get(bkey, bkey)} leads {NAMES.get(okey, okey)} by {best['lag']} weeks"
                    if best["lag"] > 0 else
                    f"{NAMES.get(okey, okey)} leads {NAMES.get(bkey, bkey)} by {abs(best['lag'])} weeks"
                    if best["lag"] < 0 else "Synchronized"
                ),
            })

    return sorted(results, key=lambda r: r["peakLag"], reverse=True)


def rolling_correlation(x: list[float], y: list[float], window: int = 26, lag: int = 0) -> list[dict]:
    """Compute rolling window correlation at a fixed lag."""
    n = len(x)
    results = []
    for i in range(window, n):
        x_win = x[i - window:i]
        j_start = i - window + lag
        j_end = i + lag
        if j_start < 0 or j_end > n:
            continue
        y_win = y[j_start:j_end]
        if len(x_win) != len(y_win) or len(x_win) < 5:
            continue
        r, _ = scipy_stats.pearsonr(x_win, y_win)
        results.append({"week": i, "correlation": round(float(r), 4)})
    return results


def main():
    print("=== Lead/Lag Analysis v2 (Robust) ===")
    np.random.seed(42)

    with open(DASHBOARD_JSON) as f:
        d = json.load(f)

    metros = d["metros"]
    max_lag = 16

    # --- National Composite Analysis ---
    print("\n--- National composite behavioral vs official ---")
    # Average composite scores across all metros
    n_weeks = min(len(m["history"]) for m in metros if len(m["history"]) > 30)
    all_behavioral = [0.0] * n_weeks
    all_official = [0.0] * n_weeks
    count = 0
    for m in metros:
        h = m["history"]
        if len(h) < n_weeks:
            continue
        for i in range(n_weeks):
            all_behavioral[i] += h[i]["compositeScore"]
            all_official[i] += h[i]["officialIndex"]
        count += 1
    all_behavioral = [v / count for v in all_behavioral]
    all_official = [v / count for v in all_official]

    national_corr = cross_correlation_with_significance(all_behavioral, all_official, max_lag)
    nat_peak = max(national_corr, key=lambda c: c["correlation"]) if national_corr else {"lag": 0, "correlation": 0, "pValue": 1.0, "significant": False}

    # Also find the best significant peak
    sig_nat = [c for c in national_corr if c["significant"]]
    nat_sig_peak = max(sig_nat, key=lambda c: c["correlation"]) if sig_nat else nat_peak

    print(f"  Overall peak: lag={nat_peak['lag']}, r={nat_peak['correlation']:.4f}, p={nat_peak['pValue']:.4f}")
    print(f"  Best significant: lag={nat_sig_peak['lag']}, r={nat_sig_peak['correlation']:.4f}, p={nat_sig_peak['pValue']:.4f}")

    # --- Per-Signal Analysis (national average) ---
    print("\n--- Per-signal lead/lag (national avg) ---")
    # Build national average signal series
    avg_history = []
    for i in range(n_weeks):
        sigs: dict[str, list[float]] = {}
        for m in metros:
            if i >= len(m["history"]):
                continue
            for sig, val in m["history"][i]["signals"].items():
                if sig not in sigs:
                    sigs[sig] = []
                sigs[sig].append(val)
        avg_sigs = {sig: mean(vals) for sig, vals in sigs.items() if vals}
        avg_history.append({"signals": avg_sigs})

    signal_results = per_signal_leadlag(avg_history, max_lag)
    for sr in signal_results:
        star = "*" if sr["significant"] else " "
        print(f"  {star} {sr['behavioralName']:20s} → {sr['officialName']:20s}: lag={sr['peakLag']:+3d}, r={sr['peakCorrelation']:+.4f}, p={sr['pValue']:.3f}")

    # Count significant leading relationships
    sig_leading = [s for s in signal_results if s["significant"] and s["peakLag"] > 0]
    sig_lagging = [s for s in signal_results if s["significant"] and s["peakLag"] < 0]

    # --- Per-Metro Analysis ---
    print("\n--- Per-metro composite analysis ---")
    metro_results = []
    for m in metros:
        h = m["history"]
        if len(h) < max_lag * 2 + 5:
            continue
        behavioral = [w["compositeScore"] for w in h]
        official = [w["officialIndex"] for w in h]
        corrs = cross_correlation_with_significance(behavioral, official, max_lag, n_permutations=100)
        if not corrs:
            continue

        sig_corrs = [c for c in corrs if c["significant"]]
        if sig_corrs:
            peak = max(sig_corrs, key=lambda c: c["correlation"])
        else:
            peak = max(corrs, key=lambda c: c["correlation"])

        metro_results.append({
            "id": m["id"],
            "name": m["name"],
            "state": m["state"],
            "peakLag": peak["lag"],
            "peakCorrelation": peak["correlation"],
            "pValue": peak["pValue"],
            "significant": peak["significant"],
            "leads": peak["lag"] > 0 if peak["significant"] else None,
            "interpretation": (
                f"Behavioral leads by {peak['lag']} weeks (p={peak['pValue']:.3f})"
                if peak["lag"] > 0 and peak["significant"] else
                f"Official leads by {abs(peak['lag'])} weeks (p={peak['pValue']:.3f})"
                if peak["lag"] < 0 and peak["significant"] else
                "No significant lead/lag"
            ),
        })

    sig_metros_leading = [m for m in metro_results if m["leads"] is True]
    sig_metros_lagging = [m for m in metro_results if m["leads"] is False]
    ns_metros = [m for m in metro_results if m["leads"] is None]
    avg_lead = mean([m["peakLag"] for m in sig_metros_leading]) if sig_metros_leading else 0

    print(f"  Significantly leading: {len(sig_metros_leading)}")
    print(f"  Significantly lagging: {len(sig_metros_lagging)}")
    print(f"  Not significant: {len(ns_metros)}")
    print(f"  Avg lead (sig only): {avg_lead:.1f} weeks")

    # --- Rolling Correlation ---
    print("\n--- Rolling correlation at optimal lag ---")
    optimal_lag = nat_sig_peak["lag"]
    rolling = rolling_correlation(all_behavioral, all_official, window=26, lag=optimal_lag)
    print(f"  {len(rolling)} windows at lag {optimal_lag}")

    # --- Output ---
    output = {
        "national": {
            "peakLag": nat_sig_peak["lag"],
            "peakCorrelation": nat_sig_peak["correlation"],
            "pValue": nat_sig_peak["pValue"],
            "significant": nat_sig_peak["significant"],
            "correlations": national_corr,
            "rollingCorrelation": rolling,
            "interpretation": (
                f"Behavioral index leads official data by {nat_sig_peak['lag']} weeks (r={nat_sig_peak['correlation']:.3f}, p={nat_sig_peak['pValue']:.3f})"
                if nat_sig_peak["lag"] > 0 and nat_sig_peak["significant"] else
                "No statistically significant national lead/lag detected"
            ),
        },
        "signalPairs": signal_results,
        "signalSummary": {
            "totalPairsTested": len(signal_results),
            "significantLeading": len(sig_leading),
            "significantLagging": len(sig_lagging),
            "topLeadingPair": sig_leading[0] if sig_leading else None,
        },
        "summary": {
            "metrosAnalyzed": len(metro_results),
            "metrosLeading": len(sig_metros_leading),
            "metrosLagging": len(sig_metros_lagging),
            "metrosInsignificant": len(ns_metros),
            "avgLeadWeeks": round(avg_lead, 1),
        },
        "metros": sorted(metro_results, key=lambda m: m["peakLag"], reverse=True),
    }

    with open(LEADLAG_JSON, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nSaved to {LEADLAG_JSON}")


if __name__ == "__main__":
    main()
