"""
FRED Macro Indicators pipeline — pulls national-level ground truth economic data.

Series:
  - GDP: Real GDP (quarterly, GDPC1)
  - CPI: Consumer Price Index (monthly, CPIAUCSL)
  - Consumer Sentiment: University of Michigan (monthly, UMCSENT)
  - Fed Funds Rate: effective rate (daily→weekly, DFF)
  - 10-Year Treasury: constant maturity (daily→weekly, DGS10)
  - PCE: Personal Consumption Expenditures price index (monthly, PCEPI)
  - Retail Sales: advance monthly (RSAFS)
  - Industrial Production: (monthly, INDPRO)
  - Nonfarm Payrolls: total (monthly, PAYEMS)
  - Consumer Credit: total outstanding (monthly, TOTALSL)

Uses FRED CSV fallback (no API key needed).
"""

import json
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import OUTPUT_DIR

SERIES = {
    # Quarterly
    "real_gdp": {"id": "GDPC1", "freq": "quarterly", "name": "Real GDP", "unit": "Billions $", "transform": "level"},
    "gdp_growth": {"id": "A191RL1Q225SBEA", "freq": "quarterly", "name": "GDP Growth Rate", "unit": "%", "transform": "level"},
    # Monthly
    "cpi": {"id": "CPIAUCSL", "freq": "monthly", "name": "CPI (All Urban)", "unit": "Index", "transform": "yoy_pct"},
    "core_cpi": {"id": "CPILFESL", "freq": "monthly", "name": "Core CPI (ex Food/Energy)", "unit": "Index", "transform": "yoy_pct"},
    "consumer_sentiment": {"id": "UMCSENT", "freq": "monthly", "name": "Consumer Sentiment (UMich)", "unit": "Index", "transform": "level"},
    "pce_price_index": {"id": "PCEPI", "freq": "monthly", "name": "PCE Price Index", "unit": "Index", "transform": "yoy_pct"},
    "retail_sales": {"id": "RSAFS", "freq": "monthly", "name": "Retail Sales", "unit": "Millions $", "transform": "yoy_pct"},
    "industrial_production": {"id": "INDPRO", "freq": "monthly", "name": "Industrial Production", "unit": "Index", "transform": "yoy_pct"},
    "nonfarm_payrolls": {"id": "PAYEMS", "freq": "monthly", "name": "Nonfarm Payrolls", "unit": "Thousands", "transform": "mom_change"},
    "unemployment_rate_national": {"id": "UNRATE", "freq": "monthly", "name": "National Unemployment Rate", "unit": "%", "transform": "level"},
    "consumer_credit": {"id": "TOTALSL", "freq": "monthly", "name": "Consumer Credit Outstanding", "unit": "Billions $", "transform": "yoy_pct"},
    # Daily → aggregated to weekly/monthly
    "fed_funds_rate": {"id": "DFF", "freq": "daily", "name": "Fed Funds Rate", "unit": "%", "transform": "level"},
    "treasury_10y": {"id": "DGS10", "freq": "daily", "name": "10-Year Treasury Yield", "unit": "%", "transform": "level"},
    "treasury_2y": {"id": "DGS2", "freq": "daily", "name": "2-Year Treasury Yield", "unit": "%", "transform": "level"},
}


def fetch_fred_csv(series_id: str, start_date: str) -> pd.DataFrame:
    """Fetch a FRED series via direct CSV download."""
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}&cosd={start_date}"
    try:
        df = pd.read_csv(url)
        if df.empty:
            return pd.DataFrame()
        df.columns = ["date", "value"]
        df["date"] = pd.to_datetime(df["date"])
        df["value"] = pd.to_numeric(df["value"], errors="coerce")
        df = df.dropna(subset=["value"])
        return df
    except Exception as e:
        print(f"    Failed: {e}")
        return pd.DataFrame()


def compute_yoy_pct(df: pd.DataFrame) -> pd.DataFrame:
    """Compute year-over-year percentage change."""
    df = df.sort_values("date").copy()
    df["yoy_pct"] = df["value"].pct_change(periods=12) * 100  # 12 months
    return df


def compute_mom_change(df: pd.DataFrame) -> pd.DataFrame:
    """Compute month-over-month absolute change."""
    df = df.sort_values("date").copy()
    df["mom_change"] = df["value"].diff()
    return df


def aggregate_daily_to_monthly(df: pd.DataFrame) -> pd.DataFrame:
    """Aggregate daily data to monthly averages."""
    df = df.set_index("date").resample("ME").mean().reset_index()
    return df


def main():
    print("=== FRED Macro Indicators Pipeline ===")
    start_date = (datetime.now() - timedelta(days=1900)).strftime("%Y-%m-%d")

    all_data = {}
    for key, spec in SERIES.items():
        print(f"  Fetching {spec['name']} ({spec['id']})...", end=" ")
        df = fetch_fred_csv(spec["id"], start_date)
        if df.empty:
            print("NO DATA")
            continue

        # Apply transforms
        if spec["freq"] == "daily":
            df = aggregate_daily_to_monthly(df)

        if spec["transform"] == "yoy_pct":
            df = compute_yoy_pct(df)
            value_col = "yoy_pct"
        elif spec["transform"] == "mom_change":
            df = compute_mom_change(df)
            value_col = "mom_change"
        else:
            value_col = "value"

        # Build output
        points = []
        for _, row in df.iterrows():
            val = row.get(value_col, row.get("value"))
            if pd.notna(val):
                points.append({
                    "date": row["date"].strftime("%Y-%m-%d"),
                    "value": round(float(val), 3),
                    "raw": round(float(row["value"]), 3) if "value" in row and value_col != "value" else None,
                })

        all_data[key] = {
            "name": spec["name"],
            "seriesId": spec["id"],
            "unit": spec["unit"],
            "frequency": spec["freq"] if spec["freq"] != "daily" else "monthly",
            "transform": spec["transform"],
            "points": points[-24:],  # Keep last 24 data points
        }
        print(f"{len(points[-24:])} points")
        time.sleep(0.5)

    output_path = OUTPUT_DIR / "fred_macro.json"
    with open(output_path, "w") as f:
        json.dump(all_data, f, indent=2)
    print(f"\nSaved to {output_path}")
    print(f"Series fetched: {len([v for v in all_data.values() if v['points']])}/{len(SERIES)}")


if __name__ == "__main__":
    main()
