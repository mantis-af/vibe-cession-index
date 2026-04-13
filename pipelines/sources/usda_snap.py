"""
USDA SNAP (food stamp) enrollment pipeline — state-level participation data.

Source: USDA FNS publishes monthly SNAP participation by state.
This is a direct measure of food insecurity — rises before official recessions.
State-level data is mapped to metros via config.py state codes.
"""

import json
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

_STATES = sorted(set(m.state for m in METROS))

# National SNAP series on FRED
NATIONAL_SNAP = "SNAP"


def fetch_fred_csv(series_id: str, start_date: str) -> list[dict]:
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}&cosd={start_date}"
    try:
        df = pd.read_csv(url)
        if df.empty:
            return []
        df.columns = ["date", "value"]
        df["value"] = pd.to_numeric(df["value"], errors="coerce")
        df = df.dropna(subset=["value"])
        return [{"date": str(row["date"]), "value": round(float(row["value"]), 0)} for _, row in df.iterrows()]
    except Exception:
        return []


def main():
    print("=== USDA SNAP Enrollment Pipeline ===")
    start_date = (datetime.now() - timedelta(days=730)).strftime("%Y-%m-%d")

    # National SNAP
    print("  National SNAP participation...")
    national_points = fetch_fred_csv(NATIONAL_SNAP, start_date)
    print(f"    {len(national_points)} points")

    # Try state-level SNAP via FRED (multiple series ID patterns)
    state_snap = {}
    print("\nState SNAP participation:")
    for state in _STATES:
        series_ids = [f"BR{state}SNAP", f"SNAP{state}", f"{state}SNAP"]
        points = []
        for sid in series_ids:
            points = fetch_fred_csv(sid, start_date)
            if points:
                print(f"  {state}: {len(points)} points (via {sid})")
                break
        if not points:
            print(f"  {state}: no data found")
        state_snap[state] = {"points": points}
        time.sleep(0.3)

    # Map to metros
    metro_snap = {}
    for metro in METROS:
        st = metro.state
        metro_snap[metro.id] = {
            "metro": metro.name,
            "state": metro.state,
            "points": state_snap.get(st, {}).get("points", []),
        }

    output = {
        "national": {"points": national_points},
        "states": state_snap,
        "metros": metro_snap,
    }

    output_path = OUTPUT_DIR / "usda_snap.json"
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nSaved to {output_path}")
    print(f"States with data: {sum(1 for v in state_snap.values() if v['points'])}/{len(_STATES)}")


if __name__ == "__main__":
    main()
