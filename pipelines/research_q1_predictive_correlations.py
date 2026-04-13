"""
Research Q1: For each official economic indicator, which alt-data series
has the highest predictive correlation at various lags?

Methodology:
- Identify ~15 key official benchmarks (monthly/quarterly, lagging)
- Identify all alt-data series (weekly/daily, leading candidates)
- For each (alt, official) pair:
  - Align by date, first-difference both to remove trends
  - Compute cross-correlation at lags 0 to 16 weeks
  - Record peak lag and correlation
  - Compute out-of-sample R² via rolling regression
- Rank all pairs by predictive power (OOS R²)

Output: docs/research/q1_predictive_correlations.md
"""

import sqlite3
import sys
from pathlib import Path
from statistics import mean, stdev
from collections import defaultdict

import numpy as np
from scipy import stats as sp_stats

DB = Path(__file__).parent.parent / "data" / "undercurrent.db"

# ─── Official benchmarks to predict ───
OFFICIALS = {
    "labor_payems": "Nonfarm Payrolls",
    "consumer_umcsent": "Consumer Sentiment (UMich)",
    "expanded_continued_claims": "Continued Unemployment Claims",
    "expanded_case_shiller": "Case-Shiller Home Prices",
    "expanded_savings_rate": "Personal Savings Rate",
    "expanded_vehicle_sales": "Vehicle Sales",
    "manuf_tcu": "Capacity Utilization",
    "manuf_ipman": "Manufacturing Production",
    "expanded_job_openings": "JOLTS Job Openings",
    "expanded_quit_rate": "JOLTS Quit Rate",
    "labor_civpart": "Labor Force Participation",
}

def get_series(conn, sid):
    rows = conn.execute("SELECT date, value FROM datapoints WHERE series_id = ? ORDER BY date", (sid,)).fetchall()
    return [(r[0], r[1]) for r in rows]

def first_diff(pts):
    """Convert levels to changes — removes trend-driven spurious correlations."""
    return [(pts[i][0], pts[i][1] - pts[i-1][1]) for i in range(1, len(pts))]

def align(x_pts, y_pts):
    """Align two series by date, return overlapping values."""
    x_map = dict(x_pts)
    y_map = dict(y_pts)
    common = sorted(set(x_map) & set(y_map))
    if len(common) < 15:
        return [], []
    return [x_map[d] for d in common], [y_map[d] for d in common]

def weekly_avg(pts):
    """Aggregate daily data to weekly (Monday-aligned)."""
    from datetime import datetime, timedelta
    weekly = {}
    for date_str, val in pts:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        monday = dt - timedelta(days=dt.weekday())
        key = monday.strftime("%Y-%m-%d")
        if key not in weekly:
            weekly[key] = []
        weekly[key].append(val)
    return sorted([(k, mean(v)) for k, v in weekly.items()])

def cross_corr_peak(x, y, max_lag=16):
    """Find the lag (0 to max_lag) where x best predicts y."""
    n = len(x)
    if n < max_lag + 10:
        return None

    xa = np.array(x)
    ya = np.array(y)
    sx, sy = np.std(xa), np.std(ya)
    if sx < 1e-10 or sy < 1e-10:
        return None

    xa = (xa - np.mean(xa)) / sx
    ya = (ya - np.mean(ya)) / sy

    best = {"lag": 0, "r": 0}
    for lag in range(0, max_lag + 1):
        if lag >= n - 8: break
        xs = xa[:n - lag] if lag > 0 else xa
        ys = ya[lag:] if lag > 0 else ya
        pairs = min(len(xs), len(ys))
        if pairs < 10: continue
        r = float(np.corrcoef(xs[:pairs], ys[:pairs])[0, 1])
        if abs(r) > abs(best["r"]):
            best = {"lag": lag, "r": round(r, 4)}

    if abs(best["r"]) < 0.05:
        return None
    return best

def oos_r2(x, y, lag, window=30):
    """Out-of-sample R² via rolling 1-step-ahead forecast."""
    n = len(x)
    if n < window + lag + 5:
        return None
    errors_model, errors_naive = [], []
    for t in range(window + lag, n):
        x_train = x[t - window - lag:t - lag]
        y_train = y[t - window:t]
        if len(x_train) != len(y_train) or len(x_train) < 10:
            continue
        try:
            slope, intercept, _, _, _ = sp_stats.linregress(x_train, y_train)
        except: continue
        y_pred = slope * x[t - lag] + intercept
        y_actual = y[t]
        errors_model.append((y_actual - y_pred) ** 2)
        errors_naive.append((y_actual - mean(y_train)) ** 2)
    if not errors_model or sum(errors_naive) < 1e-10:
        return None
    return round(1.0 - sum(errors_model) / sum(errors_naive), 4)


def main():
    print("=== Research Q1: Predictive Correlations ===\n")
    conn = sqlite3.connect(str(DB))

    # Get all candidate alt-data series (exclude the official ones and metro index/gap)
    candidates = conn.execute("""
        SELECT id, name, scope, frequency, point_count FROM series
        WHERE point_count >= 30
        AND id NOT LIKE 'metro_%_index'
        AND id NOT LIKE 'metro_%_official'
        AND id NOT LIKE 'metro_%_gap'
        ORDER BY point_count DESC
    """).fetchall()
    print(f"Candidate alt-data series: {len(candidates)}")

    results = defaultdict(list)  # official_id -> [(alt_id, alt_name, lag, r, oos)]

    for off_id, off_name in OFFICIALS.items():
        off_pts = get_series(conn, off_id)
        if len(off_pts) < 15:
            print(f"  SKIP {off_name}: only {len(off_pts)} pts")
            continue

        # First-difference official series
        off_diff = first_diff(off_pts)
        if len(off_diff) < 15:
            continue

        tested = 0
        for cand in candidates:
            cid, cname, cscope, cfreq, ccount = cand

            # Skip self
            if cid == off_id:
                continue

            alt_pts = get_series(conn, cid)
            if len(alt_pts) < 20:
                continue

            # Aggregate daily to weekly if needed
            if cfreq == "daily" and len(alt_pts) > 200:
                alt_pts = weekly_avg(alt_pts)

            # First-difference
            alt_diff = first_diff(alt_pts)

            # Align
            x, y = align(alt_diff, off_diff)
            if len(x) < 15:
                continue

            # Cross-correlation
            peak = cross_corr_peak(x, y, max_lag=16)
            if not peak or abs(peak["r"]) < 0.15:
                continue

            # OOS R²
            oos = oos_r2(x, y, peak["lag"])

            results[off_id].append({
                "alt_id": cid,
                "alt_name": cname,
                "scope": cscope,
                "lag": peak["lag"],
                "r": peak["r"],
                "oos_r2": oos,
                "has_oos": oos is not None and oos > 0,
            })
            tested += 1

        # Sort by |r| descending
        results[off_id].sort(key=lambda x: abs(x["r"]), reverse=True)
        sig_count = len([r for r in results[off_id] if r["has_oos"]])
        print(f"  {off_name}: tested {tested}, significant {len(results[off_id])}, OOS>0: {sig_count}")

    conn.close()

    # ─── Write findings ───
    out = Path(__file__).parent.parent / "docs" / "research" / "q1_predictive_correlations.md"
    with open(out, "w") as f:
        f.write("# Q1: Which Alt-Data Series Best Predict Official Benchmarks?\n\n")
        f.write("Methodology: first-differenced both series, cross-correlation at lags 0-16 weeks,\n")
        f.write("out-of-sample R² via rolling 30-period regression.\n\n")

        for off_id, off_name in OFFICIALS.items():
            rels = results[off_id]
            if not rels:
                continue

            # Show top 10 with OOS R² > 0 first, then top 10 by correlation
            oos_positive = [r for r in rels if r["has_oos"]]
            oos_positive.sort(key=lambda r: r["oos_r2"], reverse=True)

            f.write(f"## {off_name} (`{off_id}`)\n\n")

            if oos_positive:
                f.write("### Top predictors (out-of-sample R² > 0)\n\n")
                f.write("| Alt Signal | Scope | Lag | r | OOS R² |\n")
                f.write("|-----------|-------|-----|---|--------|\n")
                for r in oos_positive[:10]:
                    f.write(f"| {r['alt_name'][:45]} | {r['scope']} | {r['lag']}w | {r['r']:+.3f} | {r['oos_r2']:.3f} |\n")
                f.write("\n")

            f.write("### Top by correlation (in-sample)\n\n")
            f.write("| Alt Signal | Scope | Lag | r |\n")
            f.write("|-----------|-------|-----|---|\n")
            for r in rels[:10]:
                f.write(f"| {r['alt_name'][:45]} | {r['scope']} | {r['lag']}w | {r['r']:+.3f} |\n")
            f.write("\n")

        # Summary: best predictor per official metric
        f.write("## Summary: Best Predictor Per Metric\n\n")
        f.write("| Official Metric | Best Alt Signal | Lag | OOS R² | In-Sample r |\n")
        f.write("|----------------|----------------|-----|--------|-------------|\n")
        for off_id, off_name in OFFICIALS.items():
            rels = results[off_id]
            oos_pos = [r for r in rels if r["has_oos"]]
            if oos_pos:
                best = max(oos_pos, key=lambda r: r["oos_r2"])
                f.write(f"| {off_name} | {best['alt_name'][:35]} | {best['lag']}w | {best['oos_r2']:.3f} | {best['r']:+.3f} |\n")
            elif rels:
                best = rels[0]
                f.write(f"| {off_name} | {best['alt_name'][:35]} | {best['lag']}w | N/A | {best['r']:+.3f} |\n")
            else:
                f.write(f"| {off_name} | (no significant predictors found) | — | — | — |\n")

        f.write("\n## Key Takeaways\n\n")
        f.write("(To be filled after reviewing results)\n")

    print(f"\nResults written to {out}")


if __name__ == "__main__":
    main()
