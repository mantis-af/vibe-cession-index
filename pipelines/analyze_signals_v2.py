"""
Signal Analysis v2 — Robust, trend-removed, OOS-focused.

Key improvements over v1:
- Use FIRST DIFFERENCES to remove trend-driven spurious correlations
- Require out-of-sample R² > 0 (actual predictive power, not just in-sample fit)
- Use longest available outcome series (continued claims = 104 weeks)
- Group by economic plausibility category
- Penalize overly long lags (>16 weeks)
"""

import sys
import sqlite3
from pathlib import Path
from statistics import mean
from collections import defaultdict

import numpy as np
from scipy import stats as scipy_stats

DB_PATH = Path(__file__).parent.parent / "data" / "undercurrent.db"


def get_conn():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def get_series(series_id, conn):
    rows = conn.execute(
        "SELECT date, value FROM datapoints WHERE series_id = ? ORDER BY date",
        (series_id,)
    ).fetchall()
    return [(r["date"], r["value"]) for r in rows]


def align_and_diff(x_dv, y_dv):
    """Align two series by date and compute first differences."""
    x_map = dict(x_dv)
    y_map = dict(y_dv)
    common = sorted(set(x_map.keys()) & set(y_map.keys()))
    if len(common) < 25:
        return [], []
    x_vals = [x_map[d] for d in common]
    y_vals = [y_map[d] for d in common]
    # First differences
    x_diff = [x_vals[i] - x_vals[i-1] for i in range(1, len(x_vals))]
    y_diff = [y_vals[i] - y_vals[i-1] for i in range(1, len(y_vals))]
    return x_diff, y_diff


def find_best_lag(x, y, max_lag=16):
    """Find lag where x best leads y. Uses first-differenced data."""
    n = len(x)
    if n < max_lag + 15:
        return None

    xa = np.array(x)
    ya = np.array(y)
    sx, sy = np.std(xa), np.std(ya)
    if sx < 1e-10 or sy < 1e-10:
        return None

    xa = (xa - np.mean(xa)) / sx
    ya = (ya - np.mean(ya)) / sy

    best_lag = 0
    best_r = 0.0
    for lag in range(1, max_lag + 1):  # Start at 1 — we want LEADING, not concurrent
        if lag >= n - 10: break
        x_s = xa[:n-lag]
        y_s = ya[lag:]
        pairs = min(len(x_s), len(y_s))
        if pairs < 15: continue
        r = float(np.corrcoef(x_s[:pairs], y_s[:pairs])[0, 1])
        # Penalize very long lags slightly (prefer parsimonious models)
        adj_r = r * (1.0 - 0.005 * lag)
        if abs(adj_r) > abs(best_r):
            best_r = r
            best_lag = lag

    if abs(best_r) < 0.08:
        return None

    # Significance
    n_eff = n - best_lag
    t_stat = best_r * np.sqrt((n_eff - 2) / (1 - best_r**2 + 1e-10))
    p_value = 2 * (1 - scipy_stats.t.cdf(abs(t_stat), n_eff - 2))

    return {"lag": best_lag, "r": round(best_r, 4), "p": round(p_value, 6), "n": n_eff}


def rolling_oos_r2(x, y, lag, window=40):
    """Out-of-sample R² on first-differenced data. The gold standard."""
    n = len(x)
    if n < window + lag + 5:
        return None

    errors_model = []
    errors_naive = []

    for t in range(window + lag, n):
        x_train = x[t-window-lag:t-lag]
        y_train = y[t-window:t]
        if len(x_train) != len(y_train) or len(x_train) < 15:
            continue
        try:
            slope, intercept, _, _, _ = scipy_stats.linregress(x_train, y_train)
        except: continue

        y_pred = slope * x[t-lag] + intercept
        y_actual = y[t]
        errors_model.append((y_actual - y_pred)**2)
        errors_naive.append((y_actual - mean(y_train))**2)

    if not errors_model or sum(errors_naive) < 1e-10:
        return None
    return round(1.0 - sum(errors_model) / sum(errors_naive), 4)


def main():
    print("=== Signal Analysis v2 (Robust, First-Differenced, OOS) ===\n")
    conn = get_conn()

    # ─── Outcome variables (use the longest series) ───
    # Find the best outcome series
    outcome_candidates = conn.execute("""
        SELECT id, name, point_count FROM series
        WHERE (LOWER(name) LIKE '%continued claim%'
               OR LOWER(name) LIKE '%initial claim%'
               OR LOWER(name) LIKE '%unemployment rate%'
               OR LOWER(name) LIKE '%consumer sentiment%'
               OR LOWER(name) LIKE '%nonfarm payroll%')
          AND scope = 'national'
        ORDER BY point_count DESC
    """).fetchall()

    print("Available outcome series:")
    for o in outcome_candidates:
        print(f"  {o['id']:40s} {o['name']:40s} {o['point_count']} pts")

    # Pick outcomes with most data
    outcomes = {}
    for o in outcome_candidates:
        name_lower = o["name"].lower()
        if "continued" in name_lower and "continued_claims" not in outcomes:
            outcomes["continued_claims"] = {"id": o["id"], "name": o["name"], "invert": True}
        elif "initial" in name_lower and "national" in name_lower and "initial_claims" not in outcomes:
            outcomes["initial_claims"] = {"id": o["id"], "name": o["name"], "invert": True}
        elif "sentiment" in name_lower and "sentiment" not in outcomes:
            outcomes["sentiment"] = {"id": o["id"], "name": o["name"], "invert": False}
        elif "nonfarm" in name_lower and o["point_count"] > 50 and "nonfarm" not in outcomes:
            outcomes["nonfarm"] = {"id": o["id"], "name": o["name"], "invert": False}

    print(f"\nUsing {len(outcomes)} outcomes:")
    outcome_data = {}
    for key, spec in outcomes.items():
        data = get_series(spec["id"], conn)
        if data:
            outcome_data[key] = (data, spec["invert"])
            print(f"  {key}: {spec['name']} ({len(data)} pts)")

    # ─── Get candidate signals ───
    candidates = conn.execute("""
        SELECT id, name, category, scope, point_count FROM series
        WHERE point_count >= 30
        ORDER BY point_count DESC
    """).fetchall()
    print(f"\nCandidates: {len(candidates)}")

    # ─── Screen ───
    results = []
    for i, cand in enumerate(candidates):
        cand_data = get_series(cand["id"], conn)
        if len(cand_data) < 30: continue

        for outcome_key, (outcome_vals, invert) in outcome_data.items():
            x_diff, y_diff = align_and_diff(cand_data, outcome_vals)
            if len(x_diff) < 25: continue

            # Invert if lower = better
            if invert:
                y_diff = [-v for v in y_diff]

            peak = find_best_lag(x_diff, y_diff, max_lag=16)
            if not peak or peak["p"] > 0.01:
                continue

            # OOS R² (the real test)
            oos = rolling_oos_r2(x_diff, y_diff, peak["lag"], window=40)

            results.append({
                "signal_id": cand["id"],
                "signal_name": cand["name"],
                "category": cand["category"],
                "scope": cand["scope"],
                "outcome": outcome_key,
                "lag": peak["lag"],
                "r": peak["r"],
                "p": peak["p"],
                "oos_r2": oos,
                "n": peak["n"],
                "has_oos": oos is not None and oos > 0,
            })

        if (i+1) % 100 == 0:
            sig = [r for r in results if r["has_oos"]]
            print(f"  {i+1}/{len(candidates)} screened, {len(results)} significant, {len(sig)} with OOS R²>0")

    conn.close()

    # ─── Results ───
    print(f"\n{'='*100}")
    print(f"Total significant (p<0.01): {len(results)}")
    print(f"With positive OOS R²: {len([r for r in results if r['has_oos']])}")

    # Show only results with positive out-of-sample R²
    oos_positive = [r for r in results if r["has_oos"]]
    oos_positive.sort(key=lambda r: r["oos_r2"], reverse=True)

    for outcome_key in outcome_data:
        subset = [r for r in oos_positive if r["outcome"] == outcome_key]
        if not subset: continue
        print(f"\n--- Predictors of {outcome_key} (OOS R² > 0, first-differenced) ---")
        print(f"{'Signal':50s} {'Cat':12s} {'Lag':>4s} {'r':>7s} {'OOS R²':>7s} {'p':>8s}")
        print("-" * 95)
        for r in subset[:20]:
            print(f"{r['signal_name'][:49]:50s} {r['category']:12s} {r['lag']:4d} {r['r']:+7.3f} {r['oos_r2']:7.3f} {r['p']:8.5f}")

    # ─── Recommend non-redundant set ───
    print(f"\n{'='*100}")
    print("TOP NON-REDUNDANT SIGNALS WITH PROVEN OOS PREDICTIVE POWER:")
    print(f"{'='*100}")

    # Pick best signal per category that has OOS R² > 0
    cat_best = {}
    for r in oos_positive:
        cat = r["category"]
        if cat not in cat_best or (r["oos_r2"] or 0) > (cat_best[cat]["oos_r2"] or 0):
            cat_best[cat] = r

    recommended = sorted(cat_best.values(), key=lambda r: r["oos_r2"] or 0, reverse=True)

    for i, r in enumerate(recommended[:15]):
        print(f"  {i+1:2d}. {r['signal_name'][:50]:50s}")
        print(f"      Category: {r['category']:12s} | Leads {r['outcome']} by {r['lag']}w | r={r['r']:+.3f} | OOS R²={r['oos_r2']:.3f} | p={r['p']:.5f}")


if __name__ == "__main__":
    main()
