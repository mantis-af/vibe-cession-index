"""
FRED pipeline — pulls weekly initial unemployment claims by state.

Uses FRED's public API. Free, requires API key from https://fred.stlouisfed.org/docs/api/api_key.html
Set FRED_API_KEY env var, or it falls back to fetching the CSV directly.

Outputs JSON: { metro_id: { week: "YYYY-MM-DD", initial_claims: int } }
"""

import json
import os
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd
import requests

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

FRED_API_KEY = os.environ.get("FRED_API_KEY", "")
FRED_BASE = "https://api.stlouisfed.org/fred/series/observations"


def fetch_fred_series(series_id: str, start_date: str) -> list[dict]:
    """Fetch a FRED series via API if key is available, else try CSV."""
    if FRED_API_KEY:
        params = {
            "series_id": series_id,
            "api_key": FRED_API_KEY,
            "file_type": "json",
            "observation_start": start_date,
            "frequency": "w",
        }
        resp = requests.get(FRED_BASE, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        points = []
        for obs in data.get("observations", []):
            if obs["value"] == ".":
                continue
            points.append({
                "week": obs["date"],
                "initial_claims": int(float(obs["value"])),
            })
        return points
    else:
        # Fallback: direct CSV download from FRED
        url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}&cosd={start_date}"
        try:
            df = pd.read_csv(url)
            if df.empty:
                return []
            date_col = df.columns[0]
            val_col = df.columns[1]
            points = []
            for _, row in df.iterrows():
                val = row[val_col]
                if pd.isna(val) or str(val) == ".":
                    continue
                points.append({
                    "week": str(row[date_col]),
                    "initial_claims": int(float(val)),
                })
            return points
        except Exception as e:
            print(f"  CSV fallback failed for {series_id}: {e}")
            return []


def main():
    print("=== FRED Initial Claims Pipeline ===")
    if not FRED_API_KEY:
        print("  No FRED_API_KEY set — using CSV fallback (slower, no rate limit issues)")

    start_date = (datetime.now() - timedelta(days=1900)).strftime("%Y-%m-%d")  # 2 years

    # Group metros by state (claims are state-level)
    state_series: dict[str, str] = {}
    state_metros: dict[str, list] = {}
    for metro in METROS:
        sid = metro.fred_claims_series
        state_series[metro.state] = sid
        if metro.state not in state_metros:
            state_metros[metro.state] = []
        state_metros[metro.state].append(metro)

    all_data = {}
    fetched_states: dict[str, list[dict]] = {}

    for state, series_id in state_series.items():
        if series_id in fetched_states:
            continue
        print(f"Fetching {series_id} ({state})...")
        points = fetch_fred_series(series_id, start_date)
        fetched_states[series_id] = points
        print(f"  Got {len(points)} weeks")
        time.sleep(1)

    # Map state data to each metro (claims are state-level, shared across metros in same state)
    for metro in METROS:
        points = fetched_states.get(metro.fred_claims_series, [])
        all_data[metro.id] = {
            "metro": metro.name,
            "state": metro.state,
            "note": "State-level data (initial claims not available at metro level)",
            "weeks": points,
        }

    output_path = OUTPUT_DIR / "fred_claims.json"
    with open(output_path, "w") as f:
        json.dump(all_data, f, indent=2)
    print(f"\nSaved to {output_path}")
    print(f"States fetched: {len(fetched_states)}")
    print(f"Metros mapped: {len(all_data)}")


if __name__ == "__main__":
    main()
