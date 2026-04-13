"""
Research Q2: Can our weekly metro-level alt-data NOWCAST official monthly readings?

Nowcasting = estimating the present before official data is released.
Example: it's March 15. CPI for March won't be released until April 12.
Can our weekly search anxiety + housing data from March 1-14 estimate
what March CPI will be?

Method:
1. Aggregate metro signals nationally (avg z-scores per week)
2. For each official monthly metric, align weekly alt-data to the month
3. Test: does the avg alt-data from the FIRST 2-3 WEEKS of a month
   predict the official reading for that SAME month?
4. Compare OOS R² for nowcast (same month) vs forecast (next month)
5. Also test multi-signal regression: does combining signals help?
"""

import sqlite3
import sys
from pathlib import Path
from statistics import mean, stdev
from collections import defaultdict
from datetime import datetime

import numpy as np
from scipy import stats as sp_stats

DB = Path(__file__).parent.parent / "data" / "undercurrent.db"

# Alt-data signals (metro-level, weekly)
ALT_SIGNALS = {
    "google_trends_anxiety": "Search Anxiety",
    "housing_inventory": "Housing Inventory",
    "housing_dom": "Days on Market",
    "housing_price_drops": "Price Drops",
    "new_biz_apps": "New Biz Apps",
    "unemployment_rate": "Unemployment Rate",
    "initial_claims": "Initial Claims",
    "ai_job_ratio": "AI Job Ratio",
}

# Official monthly benchmarks
OFFICIALS = {
    "labor_payems": ("Nonfarm Payrolls", "mom"),     # month-over-month change
    "consumer_umcsent": ("Consumer Sentiment", "level"),
    "expanded_case_shiller": ("Case-Shiller", "yoy"),  # year-over-year %
    "expanded_savings_rate": ("Savings Rate", "level"),
    "manuf_tcu": ("Capacity Utilization", "level"),
    "expanded_job_openings": ("JOLTS Openings", "level"),
    "labor_civpart": ("Labor Participation", "level"),
    "inflation_cpiaucsl": ("CPI All Items", "yoy"),
}


def get_series(conn, sid):
    return [(r[0], r[1]) for r in conn.execute(
        "SELECT date, value FROM datapoints WHERE series_id = ? ORDER BY date", (sid,)
    ).fetchall()]


def aggregate_metro_signal(conn, signal_key):
    """Average a signal across all metros, per week. Returns {date: avg_zscore}."""
    rows = conn.execute("""
        SELECT dp.date, AVG(dp.value) as avg_z
        FROM datapoints dp
        JOIN series s ON dp.series_id = s.id
        WHERE s.id LIKE ? AND s.scope = 'metro'
        GROUP BY dp.date
        ORDER BY dp.date
    """, (f"metro_%_sig_{signal_key}",)).fetchall()
    return {r[0]: r[1] for r in rows}


def transform_official(pts, method):
    """Transform official series to rate-of-change if needed."""
    if method == "mom":
        return [(pts[i][0], pts[i][1] - pts[i-1][1]) for i in range(1, len(pts))]
    elif method == "yoy":
        result = []
        for i in range(12, len(pts)):
            prev = pts[i-12][1]
            if prev != 0:
                result.append((pts[i][0], ((pts[i][1] - prev) / abs(prev)) * 100))
        return result
    return pts


def month_key(date_str):
    """Extract YYYY-MM from a date string."""
    return date_str[:7]


def build_monthly_pairs(alt_weekly, official_monthly):
    """For each month, compute avg alt-data from first 3 weeks and pair with official reading.

    Returns list of (alt_avg, official_value) pairs.
    """
    # Group alt-data by month
    alt_by_month = defaultdict(list)
    for date, value in alt_weekly.items():
        mk = month_key(date)
        day = int(date[8:10])
        if day <= 21:  # first 3 weeks only
            alt_by_month[mk].append(value)

    # Build pairs
    official_by_month = {month_key(d): v for d, v in official_monthly}

    pairs = []
    common_months = sorted(set(alt_by_month.keys()) & set(official_by_month.keys()))
    for mk in common_months:
        alt_vals = alt_by_month[mk]
        if len(alt_vals) >= 2:  # need at least 2 weekly readings
            pairs.append((mean(alt_vals), official_by_month[mk]))

    return pairs


def oos_r2_nowcast(pairs, window=12):
    """Out-of-sample R² via rolling window nowcast."""
    if len(pairs) < window + 3:
        return None

    errors_model, errors_naive = [], []
    for t in range(window, len(pairs)):
        x_train = [p[0] for p in pairs[t-window:t]]
        y_train = [p[1] for p in pairs[t-window:t]]

        try:
            slope, intercept, _, _, _ = sp_stats.linregress(x_train, y_train)
        except:
            continue

        y_pred = slope * pairs[t][0] + intercept
        y_actual = pairs[t][1]
        errors_model.append((y_actual - y_pred) ** 2)
        errors_naive.append((y_actual - mean(y_train)) ** 2)

    if not errors_model or sum(errors_naive) < 1e-10:
        return None
    return round(1.0 - sum(errors_model) / sum(errors_naive), 4)


def main():
    print("=== Research Q2: Nowcasting with Metro Alt-Data ===\n")
    conn = sqlite3.connect(str(DB))

    # Step 1: Aggregate each alt-signal nationally
    print("Aggregating metro signals nationally...")
    alt_national = {}
    for sig_key, sig_name in ALT_SIGNALS.items():
        data = aggregate_metro_signal(conn, sig_key)
        alt_national[sig_key] = data
        print(f"  {sig_name}: {len(data)} weekly readings")

    # Step 2: For each official metric, test nowcasting with each alt signal
    print(f"\nTesting nowcasting ({len(ALT_SIGNALS)} signals × {len(OFFICIALS)} officials)...\n")

    results = []  # (official, alt_signal, n_months, correlation, oos_r2)

    for off_id, (off_name, off_transform) in OFFICIALS.items():
        off_pts = get_series(conn, off_id)
        if len(off_pts) < 12:
            print(f"  SKIP {off_name}: only {len(off_pts)} pts")
            continue

        off_transformed = transform_official(off_pts, off_transform)

        for sig_key, sig_name in ALT_SIGNALS.items():
            alt_data = alt_national[sig_key]
            if len(alt_data) < 20:
                continue

            pairs = build_monthly_pairs(alt_data, off_transformed)
            if len(pairs) < 15:
                continue

            # In-sample correlation
            x = [p[0] for p in pairs]
            y = [p[1] for p in pairs]
            try:
                r, p_val = sp_stats.pearsonr(x, y)
            except:
                continue

            # OOS R²
            oos = oos_r2_nowcast(pairs)

            results.append({
                "official": off_name,
                "official_id": off_id,
                "alt_signal": sig_name,
                "alt_key": sig_key,
                "n_months": len(pairs),
                "r": round(r, 4),
                "p_value": round(p_val, 6),
                "oos_r2": oos,
            })

    # Step 3: Also test MULTI-SIGNAL nowcast (combine all alt signals)
    print("Testing multi-signal nowcasts...")
    multi_results = []

    for off_id, (off_name, off_transform) in OFFICIALS.items():
        off_pts = get_series(conn, off_id)
        if len(off_pts) < 12:
            continue
        off_transformed = transform_official(off_pts, off_transform)
        off_by_month = {month_key(d): v for d, v in off_transformed}

        # For each month, build a feature vector from ALL alt signals
        months_data = defaultdict(lambda: {"features": {}, "official": None})
        for sig_key in ALT_SIGNALS:
            alt_data = alt_national[sig_key]
            alt_by_month = defaultdict(list)
            for date, value in alt_data.items():
                mk = month_key(date)
                day = int(date[8:10])
                if day <= 21:
                    alt_by_month[mk].append(value)

            for mk, vals in alt_by_month.items():
                if len(vals) >= 2:
                    months_data[mk]["features"][sig_key] = mean(vals)

        for mk, val in off_by_month.items():
            if mk in months_data:
                months_data[mk]["official"] = val

        # Build training data
        feature_keys = list(ALT_SIGNALS.keys())
        train_X = []
        train_y = []
        sorted_months = sorted(months_data.keys())

        for mk in sorted_months:
            d = months_data[mk]
            if d["official"] is None:
                continue
            features = [d["features"].get(k, 0) for k in feature_keys]
            if all(f == 0 for f in features):
                continue
            train_X.append(features)
            train_y.append(d["official"])

        if len(train_X) < 15:
            continue

        # OOS R² with multi-signal regression (rolling window)
        window = 12
        errors_model, errors_naive = [], []
        for t in range(window, len(train_X)):
            X_tr = np.array(train_X[t-window:t])
            y_tr = np.array(train_y[t-window:t])
            X_test = np.array(train_X[t]).reshape(1, -1)

            try:
                # Ridge-like: add small regularization
                XtX = X_tr.T @ X_tr + 0.01 * np.eye(X_tr.shape[1])
                XtY = X_tr.T @ y_tr
                beta = np.linalg.solve(XtX, XtY)
                y_pred = float(X_test @ beta)
            except:
                continue

            errors_model.append((train_y[t] - y_pred) ** 2)
            errors_naive.append((train_y[t] - mean(y_tr)) ** 2)

        if errors_model and sum(errors_naive) > 0:
            multi_oos = round(1.0 - sum(errors_model) / sum(errors_naive), 4)
        else:
            multi_oos = None

        multi_results.append({
            "official": off_name,
            "n_months": len(train_X),
            "multi_oos_r2": multi_oos,
        })
        print(f"  {off_name}: multi-signal OOS R² = {multi_oos}")

    conn.close()

    # ─── Write findings ───
    out = Path(__file__).parent.parent / "docs" / "research" / "q2_nowcasting.md"
    with open(out, "w") as f:
        f.write("# Q2: Can Alt-Data Nowcast Official Monthly Readings?\n\n")
        f.write("## Method\n")
        f.write("- Aggregate each metro-level signal nationally (avg z-score per week)\n")
        f.write("- For each month: average the alt-signal from the first 3 weeks\n")
        f.write("- Test correlation with the official reading for THAT SAME month\n")
        f.write("- OOS R² via rolling 12-month window regression\n\n")

        f.write("## Single-Signal Nowcasting Results\n\n")

        # Group by official metric
        by_official = defaultdict(list)
        for r in results:
            by_official[r["official"]].append(r)

        for off_name in OFFICIALS.values():
            rels = by_official.get(off_name[0], [])
            if not rels:
                continue

            rels.sort(key=lambda r: abs(r["r"]), reverse=True)

            f.write(f"### {off_name[0]}\n\n")
            f.write("| Alt Signal | Months | r | p-value | OOS R² |\n")
            f.write("|-----------|--------|---|---------|--------|\n")
            for r in rels:
                oos_str = f"{r['oos_r2']:.3f}" if r["oos_r2"] is not None else "N/A"
                f.write(f"| {r['alt_signal']} | {r['n_months']} | {r['r']:+.3f} | {r['p_value']:.4f} | {oos_str} |\n")
            f.write("\n")

        f.write("## Multi-Signal Nowcasting Results\n\n")
        f.write("Combining ALL 8 alt signals via ridge regression:\n\n")
        f.write("| Official Metric | Months | Multi-Signal OOS R² |\n")
        f.write("|----------------|--------|--------------------|\n")
        for r in multi_results:
            oos_str = f"{r['multi_oos_r2']:.3f}" if r["multi_oos_r2"] is not None else "N/A"
            f.write(f"| {r['official']} | {r['n_months']} | {oos_str} |\n")

        f.write("\n## Key Takeaways\n\n")
        f.write("(See findings analysis below)\n")

    # ─── Print summary ───
    print(f"\n{'='*80}")
    print("NOWCASTING SUMMARY")
    print(f"{'='*80}")

    # Best single-signal nowcast per official metric
    print("\nBest single-signal nowcast per metric:")
    for off_name_tuple in OFFICIALS.values():
        off_name = off_name_tuple[0]
        rels = by_official.get(off_name, [])
        oos_positive = [r for r in rels if r["oos_r2"] is not None and r["oos_r2"] > 0]
        if oos_positive:
            best = max(oos_positive, key=lambda r: r["oos_r2"])
            print(f"  {off_name:25s} ← {best['alt_signal']:20s} r={best['r']:+.3f}  OOS R²={best['oos_r2']:.3f}")
        else:
            best_r = max(rels, key=lambda r: abs(r["r"])) if rels else None
            if best_r:
                print(f"  {off_name:25s} ← {best_r['alt_signal']:20s} r={best_r['r']:+.3f}  OOS R²=N/A (insufficient data)")
            else:
                print(f"  {off_name:25s}    (no alt-data available)")

    print("\nMulti-signal nowcast:")
    for r in multi_results:
        status = "✓ WORKS" if r["multi_oos_r2"] is not None and r["multi_oos_r2"] > 0.05 else "✗ weak" if r["multi_oos_r2"] is not None else "? N/A"
        oos_str = f"{r['multi_oos_r2']:.3f}" if r["multi_oos_r2"] is not None else "N/A"
        print(f"  {r['official']:25s}  OOS R²={oos_str}  {status}")

    print(f"\nResults written to {out}")


if __name__ == "__main__":
    main()
