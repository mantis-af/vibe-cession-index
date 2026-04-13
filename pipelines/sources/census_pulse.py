"""
Census Household Pulse Survey pipeline — direct hardship measures.

Source: Census Bureau experimental data product.
The Pulse Survey directly asks people: "Are you having difficulty paying bills?"
This is the closest thing to a direct vibes measurement from actual people.
"""

import json
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd
import requests

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

STATE_FIPS = {
    "AL": "01", "AZ": "04", "CA": "06", "CO": "08", "CT": "09",
    "DC": "11", "FL": "12", "GA": "13", "IL": "17", "IN": "18",
    "KY": "21", "MA": "25", "MD": "24", "MI": "26", "MN": "27",
    "MO": "29", "NC": "37", "NM": "35", "NV": "32", "NY": "36",
    "OH": "39", "OK": "40", "OR": "41", "PA": "42", "TN": "47",
    "TX": "48", "UT": "49", "VA": "51", "WA": "53", "WI": "55",
}


def fetch_fred_csv(series_id: str, start_date: str) -> list[dict]:
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}&cosd={start_date}"
    try:
        df = pd.read_csv(url)
        if df.empty:
            return []
        df.columns = ["date", "value"]
        df["value"] = pd.to_numeric(df["value"], errors="coerce")
        df = df.dropna(subset=["value"])
        return [{"date": str(row["date"]), "value": float(row["value"])} for _, row in df.iterrows()]
    except Exception:
        return []


def main():
    print("=== Census Household Pulse Survey Pipeline ===")

    api_url = "https://api.census.gov/data/timeseries/hhp"
    state_data = {}
    _states = sorted(set(m.state for m in METROS))

    # Try fetching recent Pulse Survey waves
    print("  Trying Census Pulse API...")
    for week_num in range(65, 75):
        try:
            params = {
                "get": "TBIRTH_YEAR,THHLD_NUMPER,SPENDING1",
                "for": "state:*",
                "WEEK": str(week_num),
            }
            resp = requests.get(api_url, params=params, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                if len(data) > 1:
                    print(f"    Week {week_num}: {len(data)-1} state records")
                    for row in data[1:]:
                        state_fips = row[-1] if len(row) > 0 else None
                        if state_fips:
                            for st, fips in STATE_FIPS.items():
                                if fips == state_fips:
                                    if st not in state_data:
                                        state_data[st] = []
                                    state_data[st].append({
                                        "week": week_num,
                                        "raw": row,
                                    })
            time.sleep(0.3)
        except Exception as e:
            print(f"    Week {week_num}: {e}")

    # Fallback to FRED if API returned nothing
    if not state_data:
        print("  API returned no usable data. Trying FRED fallback...")
        start = (datetime.now() - timedelta(days=730)).strftime("%Y-%m-%d")
        points = fetch_fred_csv("CDCPDE", start)
        if points:
            print(f"    National hardship proxy: {len(points)} points via FRED")
            state_data["_national"] = points

    # Map to metros
    metro_pulse = {}
    for metro in METROS:
        st = metro.state
        metro_pulse[metro.id] = {
            "metro": metro.name,
            "state": metro.state,
            "points": state_data.get(st, state_data.get("_national", [])),
            "note": "state-level data mapped to metro" if st in state_data else "national fallback",
        }

    output_path = OUTPUT_DIR / "census_pulse.json"
    with open(output_path, "w") as f:
        json.dump(metro_pulse, f, indent=2)
    print(f"\nSaved to {output_path}")
    print(f"States with data: {sum(1 for k, v in state_data.items() if k != '_national')}")


if __name__ == "__main__":
    main()
