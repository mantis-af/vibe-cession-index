"""
Systematic signal analysis — screen all series in the database to find
which ones best predict economic outcomes.

Approach:
1. Define outcome variables (what we're trying to predict):
   - Metro unemployment rate changes
   - National unemployment changes
   - Initial claims changes
   - Consumer sentiment changes
   - GDP growth

2. For each candidate signal, compute:
   - Cross-correlation at lags 0-20 weeks
   - Optimal lag (where correlation peaks)
   - Statistical significance via permutation test
   - Out-of-sample predictive R² via rolling regression

3. Rank all signals by predictive power.

4. Select the best non-redundant set for the index.
"""

import sys
import sqlite3
from pathlib import Path
from statistics import mean, stdev
from collections import defaultdict

import numpy as np
from scipy import stats as scipy_stats

sys.path.insert(0, str(Path(__file__).parent))

DB_PATH = Path(__file__).parent.parent / "data" / "undercurrent.db"


def get_conn():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def get_weekly_series(series_id: str, conn) -> list[tuple[str, float]]:
    """Get a time series, resampled to weekly if needed."""
    rows = conn.execute(
        "SELECT date, value FROM datapoints WHERE series_id = ? ORDER BY date",
        (series_id,)
    ).fetchall()
    return [(r["date"], r["value"]) for r in rows]


def align_series(x_dates_vals: list[tuple[str, float]],
                  y_dates_vals: list[tuple[str, float]]) -> tuple[list[float], list[float]]:
    """Align two series by date, returning only overlapping dates."""
    x_map = dict(x_dates_vals)
    y_map = dict(y_dates_vals)
    common = sorted(set(x_map.keys()) & set(y_map.keys()))
    if len(common) < 20:
        return [], []
    return [x_map[d] for d in common], [y_map[d] for d in common]


def detrend(series: list[float]) -> list[float]:
    n = len(series)
    if n < 3: return series
    x = np.arange(n)
    y = np.array(series)
    slope, intercept = np.polyfit(x, y, 1)
    return (y - (slope * x + intercept)).tolist()


def cross_corr_peak(x: list[float], y: list[float], max_lag: int = 20) -> dict | None:
    """Find the lag where x best predicts y. Positive lag = x leads y."""
    n = len(x)
    if n < max_lag + 10:
        return None

    xa = np.array(detrend(x))
    ya = np.array(detrend(y))
    sx, sy = np.std(xa), np.std(ya)
    if sx < 1e-8 or sy < 1e-8:
        return None

    xa = (xa - np.mean(xa)) / sx
    ya = (ya - np.mean(ya)) / sy

    best_lag = 0
    best_r = 0.0
    for lag in range(0, max_lag + 1):
        if lag >= n - 10:
            break
        x_slice = xa[:n - lag]
        y_slice = ya[lag:]
        pairs = min(len(x_slice), len(y_slice))
        if pairs < 15:
            continue
        r = float(np.corrcoef(x_slice[:pairs], y_slice[:pairs])[0, 1])
        if abs(r) > abs(best_r):
            best_r = r
            best_lag = lag

    if abs(best_r) < 0.05:
        return None

    # Significance via t-test approximation
    n_eff = n - best_lag
    if n_eff < 5:
        return None
    t_stat = best_r * np.sqrt((n_eff - 2) / (1 - best_r**2 + 1e-10))
    p_value = 2 * (1 - scipy_stats.t.cdf(abs(t_stat), n_eff - 2))

    return {
        "lag": best_lag,
        "correlation": round(best_r, 4),
        "abs_correlation": round(abs(best_r), 4),
        "p_value": round(p_value, 6),
        "significant": p_value < 0.01,
        "n_observations": n_eff,
    }


def rolling_oos_r2(x: list[float], y: list[float], lag: int, window: int = 52) -> float | None:
    """Out-of-sample R² via rolling 1-step-ahead forecast."""
    n = len(x)
    if n < window + lag + 10:
        return None

    errors_model = []
    errors_naive = []

    for t in range(window + lag, n):
        # Training window
        x_train = x[t - window - lag:t - lag]
        y_train = y[t - window:t]

        if len(x_train) != len(y_train) or len(x_train) < 20:
            continue

        # Fit simple linear regression
        try:
            slope, intercept, _, _, _ = scipy_stats.linregress(x_train, y_train)
        except Exception:
            continue

        # Predict
        x_now = x[t - lag]
        y_pred = slope * x_now + intercept
        y_actual = y[t]

        errors_model.append((y_actual - y_pred) ** 2)
        errors_naive.append((y_actual - mean(y_train)) ** 2)

    if not errors_model or sum(errors_naive) == 0:
        return None

    oos_r2 = 1.0 - sum(errors_model) / sum(errors_naive)
    return round(oos_r2, 4)


def main():
    print("=== Systematic Signal Analysis ===")
    np.random.seed(42)
    conn = get_conn()

    # ─── Define outcome variables ───
    # These are what the index should predict / track
    outcomes = {
        "national_unemployment": {
            "series_id": "inflation_unrate",  # from our DB
            "name": "National Unemployment Rate",
            "invert": True,  # lower is better
        },
        "national_claims": {
            "series_id": "expanded_continued_claims",
            "name": "Continued Claims",
            "invert": True,
        },
        "consumer_sentiment": {
            "series_id": "consumer_umcsent",
            "name": "Consumer Sentiment",
            "invert": False,  # higher is better
        },
    }

    # Also test against state/metro outcomes
    # Get some metro behavioral indices as outcomes
    metro_outcomes = conn.execute(
        "SELECT id, name FROM series WHERE id LIKE 'metro_%_index' AND scope = 'metro' LIMIT 10"
    ).fetchall()

    # ─── Get all candidate signal series ───
    candidates = conn.execute("""
        SELECT id, name, category, scope, frequency, point_count
        FROM series
        WHERE point_count >= 20
        AND id NOT LIKE 'metro_%'
        ORDER BY point_count DESC
    """).fetchall()
    print(f"Candidate signals: {len(candidates)}")

    # Load outcome data
    outcome_data = {}
    for key, spec in outcomes.items():
        data = get_weekly_series(spec["series_id"], conn)
        if data:
            outcome_data[key] = data
            print(f"Outcome '{key}': {len(data)} points")
        else:
            # Try alternate IDs
            alt_ids = conn.execute(
                "SELECT id FROM series WHERE LOWER(name) LIKE ? LIMIT 1",
                (f"%{spec['name'].lower().split()[0]}%",)
            ).fetchall()
            if alt_ids:
                data = get_weekly_series(alt_ids[0]["id"], conn)
                if data:
                    outcome_data[key] = data
                    print(f"Outcome '{key}' (via {alt_ids[0]['id']}): {len(data)} points")

    if not outcome_data:
        print("ERROR: No outcome data found. Checking what's available...")
        # Find unemployment-like series
        unemp = conn.execute(
            "SELECT id, name, point_count FROM series WHERE LOWER(name) LIKE '%unemployment%' AND scope = 'national' ORDER BY point_count DESC LIMIT 10"
        ).fetchall()
        for u in unemp:
            print(f"  {u['id']}: {u['name']} ({u['point_count']} pts)")

        sentiment = conn.execute(
            "SELECT id, name, point_count FROM series WHERE LOWER(name) LIKE '%sentiment%' ORDER BY point_count DESC LIMIT 5"
        ).fetchall()
        for s in sentiment:
            print(f"  {s['id']}: {s['name']} ({s['point_count']} pts)")

        claims = conn.execute(
            "SELECT id, name, point_count FROM series WHERE LOWER(name) LIKE '%claims%' AND scope = 'national' ORDER BY point_count DESC LIMIT 5"
        ).fetchall()
        for c in claims:
            print(f"  {c['id']}: {c['name']} ({c['point_count']} pts)")
        conn.close()
        return

    # ─── Screen all candidates against all outcomes ───
    print(f"\nScreening {len(candidates)} candidates against {len(outcome_data)} outcomes...")

    results = []
    for i, cand in enumerate(candidates):
        cand_data = get_weekly_series(cand["id"], conn)
        if len(cand_data) < 20:
            continue

        for outcome_key, outcome_vals in outcome_data.items():
            x, y = align_series(cand_data, outcome_vals)
            if len(x) < 30:
                continue

            # Invert if needed (lower unemployment = better)
            if outcomes.get(outcome_key, {}).get("invert"):
                y = [-v for v in y]

            peak = cross_corr_peak(x, y, max_lag=20)
            if not peak or not peak["significant"]:
                continue

            # Out-of-sample R²
            oos = rolling_oos_r2(x, y, peak["lag"])

            results.append({
                "signal_id": cand["id"],
                "signal_name": cand["name"],
                "signal_category": cand["category"],
                "signal_scope": cand["scope"],
                "outcome": outcome_key,
                "lag": peak["lag"],
                "correlation": peak["correlation"],
                "abs_correlation": peak["abs_correlation"],
                "p_value": peak["p_value"],
                "oos_r2": oos,
                "n_obs": peak["n_observations"],
            })

        if (i + 1) % 50 == 0:
            print(f"  Screened {i + 1}/{len(candidates)} ({len(results)} significant relationships found)")

    conn.close()

    # ─── Rank results ───
    print(f"\n{'='*80}")
    print(f"Total significant relationships: {len(results)}")

    # Sort by absolute correlation
    results.sort(key=lambda r: r["abs_correlation"], reverse=True)

    # Group by outcome
    by_outcome = defaultdict(list)
    for r in results:
        by_outcome[r["outcome"]].append(r)

    for outcome, rels in by_outcome.items():
        print(f"\n--- Best predictors of {outcome} ---")
        print(f"{'Signal':50s} {'Cat':12s} {'Lag':>4s} {'r':>7s} {'p':>8s} {'OOS R²':>7s} {'N':>5s}")
        print("-" * 100)
        seen_categories = set()
        for r in rels[:30]:
            # Mark if this is a new category (helps identify non-redundant signals)
            new_cat = "*" if r["signal_category"] not in seen_categories else " "
            seen_categories.add(r["signal_category"])
            oos_str = f"{r['oos_r2']:.3f}" if r["oos_r2"] is not None else "  N/A"
            print(f"{new_cat}{r['signal_name'][:49]:49s} {r['signal_category']:12s} {r['lag']:4d} {r['correlation']:+7.3f} {r['p_value']:8.5f} {oos_str:>7s} {r['n_obs']:5d}")

    # ─── Recommend non-redundant signal set ───
    print(f"\n{'='*80}")
    print("RECOMMENDED INDEX SIGNALS (top non-redundant by category):")
    print(f"{'='*80}")

    # Pick the best signal from each category, across all outcomes
    category_best = {}
    for r in results:
        cat = r["signal_category"]
        if cat not in category_best or r["abs_correlation"] > category_best[cat]["abs_correlation"]:
            category_best[cat] = r

    recommended = sorted(category_best.values(), key=lambda r: r["abs_correlation"], reverse=True)
    total_r = sum(r["abs_correlation"] for r in recommended[:10])

    for i, r in enumerate(recommended[:12]):
        weight = round(r["abs_correlation"] / total_r * 100, 1) if i < 10 else 0
        oos_str = f"{r['oos_r2']:.3f}" if r["oos_r2"] is not None else "N/A"
        print(f"  {i+1:2d}. {r['signal_name'][:45]:45s} | {r['signal_category']:12s} | lag={r['lag']:2d}w | r={r['correlation']:+.3f} | OOS R²={oos_str} | weight≈{weight}%")
        print(f"      Predicts: {r['outcome']} | p={r['p_value']:.5f}")


if __name__ == "__main__":
    main()
