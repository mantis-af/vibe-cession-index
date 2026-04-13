"""
Zillow Observed Rent Index (ZORI) pipeline — metro-level rent prices.

Source: Zillow Research public CSV — monthly observed rent by metro.
This gives us actual rent levels and YoY rent growth rates.
"""

import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

ZORI_URL = "https://files.zillowstatic.com/research/public_csvs/zori/Metro_zori_uc_sfrcondomfr_sm_sa_month.csv"

# Auto-generate from config: "City, ST"
ZILLOW_METRO_MAP = {m.id: f"{m.name}, {m.state}" for m in METROS}
ZILLOW_METRO_MAP["dca"] = "Washington, DC"


def main():
    print("=== Zillow Observed Rent Index (ZORI) Pipeline ===")
    print("Downloading ZORI data...")

    try:
        df = pd.read_csv(ZORI_URL)
    except Exception as e:
        print(f"  ERROR: Failed to download ZORI data: {e}")
        output_path = OUTPUT_DIR / "zillow_zori.json"
        with open(output_path, "w") as f:
            json.dump({}, f, indent=2)
        print(f"  Wrote empty output to {output_path}")
        return

    print(f"  Loaded {len(df)} metros, {df.shape[1]} columns")

    meta_cols = ["RegionID", "SizeRank", "RegionName", "RegionType", "StateName"]
    date_cols = [c for c in df.columns if c not in meta_cols]
    recent_dates = sorted(date_cols)[-24:]

    all_data = {}
    for metro in METROS:
        zillow_name = ZILLOW_METRO_MAP.get(metro.id)
        if not zillow_name:
            continue

        row = df[df["RegionName"] == zillow_name]

        # Fallback: partial name match if exact match fails
        if row.empty:
            row = df[df["RegionName"].str.contains(metro.name, case=False, na=False)]
            if not row.empty:
                print(f"  {metro.name}: exact match failed, using partial match '{row.iloc[0]['RegionName']}'")

        if row.empty:
            print(f"  {metro.name}: not found as '{zillow_name}'")
            continue

        row = row.iloc[0]
        points = []
        for date_col in recent_dates:
            val = row.get(date_col)
            if pd.notna(val):
                points.append({
                    "month": date_col[:7],
                    "rent": round(float(val), 0),
                })

        for i in range(12, len(points)):
            current = points[i]["rent"]
            year_ago = points[i - 12]["rent"]
            if year_ago > 0:
                points[i]["yoy_pct"] = round((current - year_ago) / year_ago * 100, 2)

        all_data[metro.id] = {
            "metro": metro.name,
            "state": metro.state,
            "points": points,
        }
        latest = points[-1] if points else {}
        yoy = latest.get("yoy_pct", "N/A")
        print(f"  {metro.name}: {len(points)} months, latest ${latest.get('rent', 0):,.0f}/mo, YoY {yoy}%")

    output_path = OUTPUT_DIR / "zillow_zori.json"
    with open(output_path, "w") as f:
        json.dump(all_data, f, indent=2)
    print(f"\nSaved to {output_path}")
    print(f"Metros: {sum(1 for v in all_data.values() if v['points'])}/{len(METROS)}")


if __name__ == "__main__":
    main()
