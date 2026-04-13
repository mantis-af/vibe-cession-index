"""
Research Q3: Autoregressive + Alt-Signal Nowcast Models

For each official metric, compare:
  Model A: AR-only (predict next reading from last 3 readings)
  Model B: AR + alt-signal (last 3 readings + current month alt-data avg)

The difference in OOS R² = the marginal value of our alt-data.
If Model B barely improves, our alt-data adds no signal over momentum.

Uses rolling 18-month train window with 1-step-ahead evaluation.
"""

import sqlite3
import sys
from pathlib import Path
from statistics import mean
from collections import defaultdict

import numpy as np
from scipy import stats as sp_stats

DB = Path(__file__).parent.parent / "data" / "undercurrent.db"

# Official metrics and their best alt-signal predictors (from Q2)
TARGETS = [
    {
        "name": "Personal Savings Rate",
        "official_id": "expanded_savings_rate",
        "transform": "level",
        "alt_metro_key": "initial_claims",
        "alt_invert": True,
        "q2_oos_r2": 0.47,
    },
    {
        "name": "CPI Inflation (YoY %)",
        "official_id": "inflation_cpiaucsl",
        "transform": "yoy",
        "alt_metro_key": "housing_inventory",
        "alt_invert": False,
        "q2_oos_r2": 0.31,
    },
    {
        "name": "JOLTS Job Openings",
        "official_id": "expanded_job_openings",
        "transform": "level",
        "alt_metro_key": "housing_inventory",
        "alt_invert": False,
        "q2_oos_r2": 0.30,
    },
    {
        "name": "Labor Force Participation",
        "official_id": "labor_civpart",
        "transform": "level",
        "alt_metro_key": "ai_job_ratio",
        "alt_invert": False,
        "q2_oos_r2": 0.33,
    },
    {
        "name": "Case-Shiller Home Prices",
        "official_id": "expanded_case_shiller",
        "transform": "yoy",
        "alt_metro_key": "housing_dom",
        "alt_invert": False,
        "q2_oos_r2": 0.27,
    },
    {
        "name": "Consumer Sentiment (UMich)",
        "official_id": "consumer_umcsent",
        "transform": "level",
        "alt_metro_key": "initial_claims",
        "alt_invert": True,
        "q2_oos_r2": 0.15,
    },
    {
        "name": "Unemployment Rate",
        "official_id": "macro_unemployment_rate_national",
        "transform": "level",
        "alt_metro_key": "unemployment_rate",
        "alt_invert": True,
        "q2_oos_r2": 0.04,
    },
    {
        "name": "Capacity Utilization",
        "official_id": "manuf_tcu",
        "transform": "level",
        "alt_metro_key": "housing_dom",
        "alt_invert": False,
        "q2_oos_r2": 0.07,
    },
]


def main():
    print("=== Research Q3: AR + Alt-Signal Nowcast Models ===\n")
    conn = sqlite3.connect(str(DB))

    results = []
    AR_LAGS = 3  # use last 3 official readings
    TRAIN_WINDOW = 18  # months

    for target in TARGETS:
        print(f"\n--- {target['name']} ---")

        # Load official series
        off_pts = conn.execute("SELECT date, value FROM datapoints WHERE series_id = ? ORDER BY date",
                                (target["official_id"],)).fetchall()
        if len(off_pts) < 15:
            print(f"  SKIP: only {len(off_pts)} pts")
            continue

        # Transform if needed
        if target["transform"] == "yoy":
            transformed = []
            for i in range(12, len(off_pts)):
                prev = off_pts[i - 12][1]
                if prev != 0:
                    transformed.append((off_pts[i][0], round(((off_pts[i][1] - prev) / abs(prev)) * 100, 2)))
            off_pts = transformed
        else:
            off_pts = [(r[0], r[1]) for r in off_pts]

        if len(off_pts) < AR_LAGS + TRAIN_WINDOW + 3:
            print(f"  SKIP: only {len(off_pts)} pts after transform")
            continue

        # Load alt-signal (metro average, monthly)
        alt_rows = conn.execute("""
            SELECT dp.date, AVG(dp.value) as avg_z
            FROM datapoints dp JOIN series s ON dp.series_id = s.id
            WHERE s.id LIKE ? AND s.scope = 'metro'
            GROUP BY dp.date ORDER BY dp.date
        """, (f"metro_%_sig_{target['alt_metro_key']}",)).fetchall()

        # Group alt by month (first 3 weeks)
        alt_by_month = defaultdict(list)
        for date, val in alt_rows:
            month = date[:7]
            day = int(date[8:10])
            if day <= 21:
                v = -val if target["alt_invert"] else val
                alt_by_month[month].append(v)

        alt_monthly = {m: mean(vals) for m, vals in alt_by_month.items() if len(vals) >= 2}

        # Build sequences: for each month t, we need:
        #   y[t] = official value at month t
        #   AR features: y[t-1], y[t-2], y[t-3]
        #   Alt feature: alt_avg at month t (current month alt-data)
        off_by_month = {}
        for date, val in off_pts:
            off_by_month[date[:7]] = val

        sorted_months = sorted(off_by_month.keys())

        # Build training data
        data_points = []
        for i in range(AR_LAGS, len(sorted_months)):
            m = sorted_months[i]
            y = off_by_month[m]
            ar_features = [off_by_month[sorted_months[i - j]] for j in range(1, AR_LAGS + 1)]
            alt_val = alt_monthly.get(m)

            data_points.append({
                "month": m,
                "y": y,
                "ar": ar_features,
                "alt": alt_val,
            })

        n = len(data_points)
        print(f"  Data points: {n} months")

        if n < TRAIN_WINDOW + 3:
            print(f"  SKIP: not enough data for rolling eval")
            continue

        # Rolling OOS evaluation
        ar_errors, ar_alt_errors, naive_errors = [], [], []

        for t in range(TRAIN_WINDOW, n):
            train = data_points[t - TRAIN_WINDOW:t]
            test = data_points[t]

            y_train = [d["y"] for d in train]
            y_mean = mean(y_train)

            # ─── Model A: AR-only ───
            X_ar_train = np.array([d["ar"] for d in train])
            y_ar_train = np.array(y_train)

            try:
                XtX = X_ar_train.T @ X_ar_train + 0.01 * np.eye(AR_LAGS)
                beta_ar = np.linalg.solve(XtX, X_ar_train.T @ y_ar_train)
                y_pred_ar = float(np.array(test["ar"]) @ beta_ar)
            except:
                continue

            # ─── Model B: AR + alt ───
            # Only use points where alt is available
            train_with_alt = [d for d in train if d["alt"] is not None]
            if len(train_with_alt) >= 10 and test["alt"] is not None:
                X_ar_alt_train = np.array([d["ar"] + [d["alt"]] for d in train_with_alt])
                y_ar_alt_train = np.array([d["y"] for d in train_with_alt])

                try:
                    n_feat = AR_LAGS + 1
                    XtX2 = X_ar_alt_train.T @ X_ar_alt_train + 0.01 * np.eye(n_feat)
                    beta_ar_alt = np.linalg.solve(XtX2, X_ar_alt_train.T @ y_ar_alt_train)
                    y_pred_ar_alt = float(np.array(test["ar"] + [test["alt"]]) @ beta_ar_alt)
                except:
                    y_pred_ar_alt = y_pred_ar  # fallback to AR
            else:
                y_pred_ar_alt = y_pred_ar  # no alt data available

            ar_errors.append((test["y"] - y_pred_ar) ** 2)
            ar_alt_errors.append((test["y"] - y_pred_ar_alt) ** 2)
            naive_errors.append((test["y"] - y_mean) ** 2)

        if not ar_errors or sum(naive_errors) < 1e-10:
            print(f"  No valid evaluation windows")
            continue

        ar_r2 = round(1 - sum(ar_errors) / sum(naive_errors), 4)
        ar_alt_r2 = round(1 - sum(ar_alt_errors) / sum(naive_errors), 4)
        improvement = round(ar_alt_r2 - ar_r2, 4)

        print(f"  AR-only OOS R²:     {ar_r2:.3f}")
        print(f"  AR+alt OOS R²:      {ar_alt_r2:.3f}")
        print(f"  Alt improvement:    {improvement:+.3f}")
        print(f"  Q2 alt-only OOS R²: {target['q2_oos_r2']:.3f}")

        results.append({
            "name": target["name"],
            "alt_signal": target["alt_metro_key"],
            "ar_r2": ar_r2,
            "ar_alt_r2": ar_alt_r2,
            "improvement": improvement,
            "q2_alt_only": target["q2_oos_r2"],
            "n_eval": len(ar_errors),
        })

    conn.close()

    # ─── Write findings ───
    out = Path(__file__).parent.parent / "docs" / "research" / "q3_ar_nowcast.md"
    with open(out, "w") as f:
        f.write("# Q3: Autoregressive + Alt-Signal Nowcast Models\n\n")
        f.write("## Question\n")
        f.write("Does adding our alt-data to an autoregressive baseline improve nowcasts?\n\n")
        f.write("## Method\n")
        f.write(f"- AR baseline: predict y[t] from y[t-1], y[t-2], y[t-3] (last 3 readings)\n")
        f.write(f"- AR+alt: same + current month avg of alt-signal from first 3 weeks\n")
        f.write(f"- Rolling {TRAIN_WINDOW}-month train window, 1-step-ahead OOS evaluation\n")
        f.write(f"- Ridge regression (λ=0.01) to prevent overfitting\n\n")

        f.write("## Results\n\n")
        f.write("| Metric | AR-only R² | AR+Alt R² | Alt Improvement | Q2 Alt-only R² |\n")
        f.write("|--------|-----------|-----------|----------------|---------------|\n")
        for r in sorted(results, key=lambda x: x["improvement"], reverse=True):
            imp_str = f"**{r['improvement']:+.3f}**" if r["improvement"] > 0.02 else f"{r['improvement']:+.3f}"
            f.write(f"| {r['name']} | {r['ar_r2']:.3f} | {r['ar_alt_r2']:.3f} | {imp_str} | {r['q2_alt_only']:.3f} |\n")

        f.write("\n## Key Findings\n\n")
        f.write("(Analysis below)\n\n")

        # Compute summary stats
        positive = [r for r in results if r["improvement"] > 0.02]
        negative = [r for r in results if r["improvement"] < -0.02]
        neutral = [r for r in results if abs(r["improvement"]) <= 0.02]

        f.write(f"- **{len(positive)} metrics** where alt-data meaningfully improves over AR baseline\n")
        f.write(f"- **{len(neutral)} metrics** where alt-data adds marginal/no value over momentum\n")
        f.write(f"- **{len(negative)} metrics** where alt-data hurts (likely overfitting)\n\n")

        f.write("## Implications for the Index\n\n")
        f.write("The AR baseline tells us: how much of the next reading is just momentum?\n")
        f.write("The alt improvement tells us: does our real-time data add genuine information?\n\n")
        f.write("Only metrics where improvement > 0.02 should use the AR+alt model.\n")
        f.write("Others should use AR-only or just show the latest official reading.\n")

    print(f"\n{'='*70}")
    print("SUMMARY")
    print(f"{'='*70}")
    for r in sorted(results, key=lambda x: x["improvement"], reverse=True):
        star = "★" if r["improvement"] > 0.02 else " "
        print(f"  {star} {r['name']:30s}  AR={r['ar_r2']:.3f}  AR+alt={r['ar_alt_r2']:.3f}  Δ={r['improvement']:+.3f}")
    print(f"\nWritten to {out}")


if __name__ == "__main__":
    main()
