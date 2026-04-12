"""
Zillow Home Value Index (ZHVI) pipeline — metro-level home prices.

Source: Zillow Research public CSV — monthly median home values by metro.
This gives us actual home price levels and YoY appreciation rates.
"""

import json
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

ZHVI_URL = "https://files.zillowstatic.com/research/public_csvs/zhvi/Metro_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv"

# Auto-generate from config: "City, ST"
ZILLOW_METRO_MAP = {m.id: f"{m.name}, {m.state}" for m in METROS}
ZILLOW_METRO_MAP["dca"] = "Washington, DC"


def main():
    print("=== Zillow Home Value Index Pipeline ===")
    print("Downloading ZHVI data...")
    df = pd.read_csv(ZHVI_URL)
    print(f"  Loaded {len(df)} metros, {df.shape[1]} columns")

    # Date columns are everything after the metadata columns
    meta_cols = ["RegionID", "SizeRank", "RegionName", "RegionType", "StateName"]
    date_cols = [c for c in df.columns if c not in meta_cols]
    # Keep only last 24 months
    recent_dates = sorted(date_cols)[-24:]

    all_data = {}
    for metro in METROS:
        zillow_name = ZILLOW_METRO_MAP.get(metro.id)
        if not zillow_name:
            continue

        row = df[df["RegionName"] == zillow_name]
        if row.empty:
            print(f"  {metro.name}: not found as '{zillow_name}'")
            continue

        row = row.iloc[0]
        points = []
        for date_col in recent_dates:
            val = row.get(date_col)
            if pd.notna(val):
                points.append({
                    "month": date_col[:7],  # YYYY-MM
                    "zhvi": round(float(val), 0),
                })

        # Compute YoY appreciation
        for i in range(12, len(points)):
            current = points[i]["zhvi"]
            year_ago = points[i - 12]["zhvi"]
            if year_ago > 0:
                points[i]["yoy_pct"] = round((current - year_ago) / year_ago * 100, 2)

        all_data[metro.id] = {
            "metro": metro.name,
            "state": metro.state,
            "points": points,
        }
        latest = points[-1] if points else {}
        yoy = latest.get("yoy_pct", "N/A")
        print(f"  {metro.name}: {len(points)} months, latest ${latest.get('zhvi', 0):,.0f}, YoY {yoy}%")

    output_path = OUTPUT_DIR / "zillow_zhvi.json"
    with open(output_path, "w") as f:
        json.dump(all_data, f, indent=2)
    print(f"\nSaved to {output_path}")
    print(f"Metros: {sum(1 for v in all_data.values() if v['points'])}/{len(METROS)}")


if __name__ == "__main__":
    main()
