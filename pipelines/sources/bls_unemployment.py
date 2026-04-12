"""
BLS LAUS pipeline — pulls monthly metro-level unemployment rates.

Uses the BLS Public Data API v2 (no key needed, 25 queries/day limit).
Outputs JSON: { metro_id: { month: "YYYY-MM", unemployment_rate: float } }
"""

import json
import time
import sys
from datetime import datetime
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

BLS_API_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/"


def fetch_bls_series(series_ids: list[str], start_year: int, end_year: int) -> dict:
    """Fetch multiple BLS series in a single request (max 50)."""
    payload = {
        "seriesid": series_ids,
        "startyear": str(start_year),
        "endyear": str(end_year),
    }
    resp = requests.post(BLS_API_URL, json=payload, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    if data.get("status") != "REQUEST_SUCCEEDED":
        print(f"  BLS API warning: {data.get('message', 'unknown error')}")

    results = {}
    for series in data.get("Results", {}).get("series", []):
        series_id = series["seriesID"]
        points = []
        for item in series.get("data", []):
            # BLS returns M01-M12 for monthly, M13 for annual average
            period = item["period"]
            if not period.startswith("M") or period == "M13":
                continue
            month_num = int(period[1:])
            year = int(item["year"])
            raw_value = item["value"]
            if raw_value in ("-", "", "N/A"):
                continue
            try:
                value = float(raw_value)
            except ValueError:
                continue
            month_str = f"{year}-{month_num:02d}"
            points.append({"month": month_str, "unemployment_rate": value})
        # Sort chronologically
        points.sort(key=lambda x: x["month"])
        results[series_id] = points
    return results


def main():
    print("=== BLS Unemployment Pipeline ===")
    now = datetime.now()
    start_year = now.year - 5  # 2+ years for longer lookback
    end_year = now.year

    # BLS API allows up to 50 series per request
    series_map = {}  # series_id -> metro_id
    series_ids = []
    for metro in METROS:
        sid = metro.bls_area_code
        series_map[sid] = metro.id
        series_ids.append(sid)

    print(f"Fetching {len(series_ids)} series for years {start_year}-{end_year}...")

    # Split into batches of 50 (we have 20, so one batch)
    all_data = {}
    for i in range(0, len(series_ids), 50):
        batch = series_ids[i:i + 50]
        print(f"  Batch {i // 50 + 1}: {len(batch)} series")
        results = fetch_bls_series(batch, start_year, end_year)

        for series_id, points in results.items():
            metro_id = series_map.get(series_id)
            if metro_id:
                metro = next(m for m in METROS if m.id == metro_id)
                all_data[metro_id] = {
                    "metro": metro.name,
                    "state": metro.state,
                    "months": points,
                }
                print(f"    {metro.name}: {len(points)} months")

        if i + 50 < len(series_ids):
            time.sleep(2)

    output_path = OUTPUT_DIR / "bls_unemployment.json"
    with open(output_path, "w") as f:
        json.dump(all_data, f, indent=2)
    print(f"\nSaved to {output_path}")
    print(f"Metros with data: {sum(1 for v in all_data.values() if v['months'])}/{len(METROS)}")


if __name__ == "__main__":
    main()
