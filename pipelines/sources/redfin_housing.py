"""
Redfin Housing pipeline — pulls weekly metro-level housing data.

Source: Redfin Data Center public S3 TSV (updated weekly).
Signals: inventory, median days on market, new listings, price drops, median list price.

Outputs JSON: { metro_id: { metro, state, weeks: [{ week, inventory, median_dom, ... }] } }
"""

import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

REDFIN_METRO_URL = "https://redfin-public-data.s3.us-west-2.amazonaws.com/redfin_market_tracker/redfin_metro_market_tracker.tsv000.gz"

# Auto-generate Redfin region names from config
# Redfin format: "City, ST metro area"
REDFIN_REGION_MAP = {m.id: f"{m.name}, {m.state} metro area" for m in METROS}
# Special cases where Redfin uses different names
REDFIN_REGION_MAP["dca"] = "Washington, DC metro area"
REDFIN_REGION_MAP["ftw"] = "Fort Worth, TX metro area"


def main():
    print("=== Redfin Housing Pipeline ===")
    cutoff = (datetime.now() - timedelta(days=1900)).strftime("%Y-%m-%d")

    print(f"Downloading Redfin metro data (large file, may take a minute)...")
    df = pd.read_csv(REDFIN_METRO_URL, sep="\t", compression="gzip")
    print(f"  Loaded {len(df)} rows, {df['REGION'].nunique()} metros")

    # Filter to All Residential, recent data
    df = df[
        (df["PROPERTY_TYPE"] == "All Residential")
        & (df["PERIOD_BEGIN"] >= cutoff)
    ].copy()
    print(f"  Filtered to {len(df)} rows (All Residential, since {cutoff})")

    all_data = {}
    for metro in METROS:
        region = REDFIN_REGION_MAP.get(metro.id)
        if not region:
            print(f"  {metro.name}: no Redfin mapping, skipping")
            continue

        metro_df = df[df["REGION"] == region].copy()
        if metro_df.empty:
            print(f"  {metro.name}: no data found for '{region}'")
            continue

        metro_df = metro_df.sort_values("PERIOD_BEGIN")
        weeks = []
        for _, row in metro_df.iterrows():
            week_data = {"week": row["PERIOD_BEGIN"]}

            # Core signals
            for col, key in [
                ("INVENTORY", "inventory"),
                ("MEDIAN_DOM", "median_dom"),
                ("NEW_LISTINGS", "new_listings"),
                ("PRICE_DROPS", "price_drops"),
                ("MEDIAN_LIST_PRICE", "median_list_price"),
                ("HOMES_SOLD", "homes_sold"),
                ("MEDIAN_SALE_PRICE", "median_sale_price"),
                ("MONTHS_OF_SUPPLY", "months_of_supply"),
            ]:
                val = row.get(col)
                if pd.notna(val):
                    try:
                        week_data[key] = round(float(val), 2)
                    except (ValueError, TypeError):
                        pass

            weeks.append(week_data)

        all_data[metro.id] = {
            "metro": metro.name,
            "state": metro.state,
            "weeks": weeks,
        }
        print(f"  {metro.name}: {len(weeks)} weeks")

    output_path = OUTPUT_DIR / "redfin_housing.json"
    with open(output_path, "w") as f:
        json.dump(all_data, f, indent=2)
    print(f"\nSaved to {output_path}")
    print(f"Metros with data: {sum(1 for v in all_data.values() if v['weeks'])}/{len(METROS)}")


if __name__ == "__main__":
    main()
