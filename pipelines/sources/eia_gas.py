"""
EIA Gas Prices pipeline — pulls regional gasoline prices.

Source: EIA (Energy Information Administration) publishes weekly retail
gas prices by PADD region. We can also get state-level from their API.

Uses CSV download — no API key needed.
FRED also carries these series which is our fallback.

Outputs: { region: { points: [{ week, price }] } }
"""

import json
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

# FRED series for gas prices by region (PADD districts + national)
GAS_SERIES = {
    "national": {"id": "GASREGW", "name": "US Regular Gas Price (Weekly)"},
    "east_coast": {"id": "GASREGCOVW", "name": "East Coast Regular Gas"},
    "midwest": {"id": "GASREGMIDW", "name": "Midwest Regular Gas"},
    "gulf_coast": {"id": "GASREGGULFW", "name": "Gulf Coast Regular Gas"},
    "rocky_mountain": {"id": "GASREGRMW", "name": "Rocky Mountain Regular Gas"},
    "west_coast": {"id": "GASREGPCW", "name": "West Coast Regular Gas"},
}

# Map metros to gas regions by state
_STATE_GAS_REGION = {
    "NY": "east_coast", "PA": "east_coast", "DC": "east_coast", "NC": "east_coast",
    "FL": "east_coast", "VA": "east_coast", "MD": "east_coast", "MA": "east_coast",
    "CT": "east_coast", "GA": "east_coast", "AL": "east_coast",
    "IL": "midwest", "OH": "midwest", "IN": "midwest", "WI": "midwest",
    "MN": "midwest", "MI": "midwest", "MO": "midwest", "KY": "midwest",
    "TX": "gulf_coast", "TN": "gulf_coast", "OK": "gulf_coast",
    "CO": "rocky_mountain", "AZ": "rocky_mountain", "NM": "rocky_mountain", "UT": "rocky_mountain",
    "CA": "west_coast", "WA": "west_coast", "OR": "west_coast", "NV": "west_coast",
}
METRO_GAS_REGION = {m.id: _STATE_GAS_REGION.get(m.state, "national") for m in METROS}


def fetch_fred_csv(series_id: str, start_date: str) -> list[dict]:
    """Fetch a FRED series via direct CSV download."""
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}&cosd={start_date}"
    try:
        df = pd.read_csv(url)
        if df.empty:
            return []
        df.columns = ["date", "value"]
        df["value"] = pd.to_numeric(df["value"], errors="coerce")
        df = df.dropna(subset=["value"])
        return [
            {"week": str(row["date"]), "price": round(float(row["value"]), 3)}
            for _, row in df.iterrows()
        ]
    except Exception as e:
        print(f"    Failed for {series_id}: {e}")
        return []


def main():
    print("=== EIA Gas Prices Pipeline ===")
    start_date = (datetime.now() - timedelta(days=1900)).strftime("%Y-%m-%d")

    regions_data = {}
    for region_key, spec in GAS_SERIES.items():
        print(f"  Fetching {spec['name']} ({spec['id']})...", end=" ")
        points = fetch_fred_csv(spec["id"], start_date)
        regions_data[region_key] = {
            "name": spec["name"],
            "seriesId": spec["id"],
            "points": points,
        }
        print(f"{len(points)} weeks")
        time.sleep(0.5)

    # Add metro mapping
    metro_gas = {}
    for metro in METROS:
        region = METRO_GAS_REGION.get(metro.id, "national")
        region_data = regions_data.get(region, regions_data.get("national", {}))
        metro_gas[metro.id] = {
            "metro": metro.name,
            "region": region,
            "points": region_data.get("points", []),
        }

    output = {
        "regions": regions_data,
        "metros": metro_gas,
    }

    output_path = OUTPUT_DIR / "eia_gas.json"
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nSaved to {output_path}")
    print(f"Regions: {len(regions_data)}, Metros mapped: {len(metro_gas)}")

    # Show latest prices
    nat = regions_data.get("national", {}).get("points", [])
    if nat:
        print(f"\nLatest national gas price: ${nat[-1]['price']}/gal ({nat[-1]['week']})")


if __name__ == "__main__":
    main()
