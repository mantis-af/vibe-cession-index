"""
Opportunity Insights Economic Tracker pipeline.

Source: https://github.com/OpportunityInsights/EconomicTracker
Harvard/Brown research team (Raj Chetty et al.) — gold standard for
who is feeling the economy differently. Tracks spending, employment,
and revenue by income quartile and metro.
"""

import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

OI_BASE = "https://raw.githubusercontent.com/OpportunityInsights/EconomicTracker/main/data"

DATASETS = {
    "spending": {
        "url": f"{OI_BASE}/Affinity - Metro - Daily.csv",
        "date_col": "date",
        "geo_col": "metro",
        "value_cols": ["spend_all", "spend_q1", "spend_q2", "spend_q3", "spend_q4"],
    },
    "employment": {
        "url": f"{OI_BASE}/Employment - Metro - Daily.csv",
        "date_col": "date",
        "geo_col": "metro",
        "value_cols": ["emp", "emp_incq1", "emp_incq2", "emp_incq3", "emp_incq4"],
    },
    "small_biz_revenue": {
        "url": f"{OI_BASE}/Womply - Metro - Daily.csv",
        "date_col": "date",
        "geo_col": "metro",
        "value_cols": ["revenue_all", "merchants_all"],
    },
}

OI_CBSA_MAP = {
    "nyc": 35620, "lax": 31080, "chi": 16980, "hou": 26420,
    "phx": 38060, "phl": 37980, "sat": 41700, "sdg": 41740,
    "dal": 19100, "sjc": 41940, "aus": 12420, "jax": 27260,
    "sfo": 41860, "cmh": 18140, "clt": 16740, "ind": 26900,
    "sea": 42660, "den": 19740, "dca": 47900, "bna": 34980,
    "ftw": 19100, "okc": 36420, "las": 29820, "pdx": 38900,
    "mem": 32820, "lou": 31140, "bal": 12580, "mil": 33340,
    "atl": 12060, "kcm": 28140, "ral": 39580, "mia": 33100,
    "tpa": 45300, "stl": 41180, "pit": 38300, "cin": 17140,
    "orl": 36740, "cle": 17460, "min": 33460, "det": 19820,
    "slc": 41620, "bos": 14460, "ric": 40060, "bir": 13820,
    "buf": 15380,
}


def fetch_and_process(dataset_key: str, spec: dict) -> dict:
    print(f"  Downloading {dataset_key}...")
    try:
        df = pd.read_csv(spec["url"])
    except Exception as e:
        print(f"    Failed: {e}")
        return {}

    print(f"    Loaded {len(df)} rows, columns: {list(df.columns)[:8]}...")

    cutoff = (datetime.now() - timedelta(days=400)).strftime("%Y-%m-%d")
    if spec["date_col"] in df.columns:
        df[spec["date_col"]] = pd.to_datetime(df[spec["date_col"]], errors="coerce")
        df = df[df[spec["date_col"]] >= cutoff]

    geo_col = spec["geo_col"]
    if geo_col not in df.columns:
        for alt in ["countyfips", "cbsa", "statefips", "metro_fips"]:
            if alt in df.columns:
                geo_col = alt
                break

    result = {}
    for metro_id, cbsa in OI_CBSA_MAP.items():
        metro_df = df[df[geo_col] == cbsa] if geo_col in df.columns else pd.DataFrame()
        if metro_df.empty:
            continue

        metro_df = metro_df.set_index(spec["date_col"])
        available_cols = [c for c in spec["value_cols"] if c in metro_df.columns]
        if not available_cols:
            continue

        weekly = metro_df[available_cols].resample("W-MON").mean().dropna(how="all")
        points = []
        for date, row in weekly.iterrows():
            point = {"week": date.strftime("%Y-%m-%d")}
            for col in available_cols:
                val = row[col]
                if pd.notna(val):
                    point[col] = round(float(val), 4)
            if len(point) > 1:
                points.append(point)

        if points:
            result[metro_id] = points

    print(f"    Metros with data: {len(result)}")
    return result


def main():
    print("=== Opportunity Insights Economic Tracker ===")

    all_data = {}
    for key, spec in DATASETS.items():
        data = fetch_and_process(key, spec)
        all_data[key] = data

    metro_data = {}
    for metro in METROS:
        mid = metro.id
        metro_data[mid] = {
            "metro": metro.name,
            "state": metro.state,
            "spending": all_data.get("spending", {}).get(mid, []),
            "employment": all_data.get("employment", {}).get(mid, []),
            "small_biz": all_data.get("small_biz_revenue", {}).get(mid, []),
        }

    output_path = OUTPUT_DIR / "opportunity_insights.json"
    with open(output_path, "w") as f:
        json.dump(metro_data, f, indent=2)
    print(f"\nSaved to {output_path}")
    has_any = sum(1 for v in metro_data.values()
                  if v["spending"] or v["employment"] or v["small_biz"])
    print(f"Metros with any data: {has_any}/{len(METROS)}")


if __name__ == "__main__":
    main()
