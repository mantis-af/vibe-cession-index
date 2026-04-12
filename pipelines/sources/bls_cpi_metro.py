"""
BLS CPI Metro pipeline — pulls Consumer Price Index by metro area.

BLS publishes CPI-U for ~23 major metro areas (monthly or bimonthly).
Series IDs follow pattern: CUURS{area_code}SA0 (all items, seasonally adjusted).

This gives us real local pricing data — the gap between national CPI and
metro CPI tells you where cost of living is diverging.
"""

import json
import sys
import time
from datetime import datetime
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

BLS_API_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/"

# BLS CPI area codes for our metros (not all 20 have CPI data)
# BLS publishes CPI for ~23 metro areas
CPI_AREA_MAP = {
    "nyc": "CUURS12ASA0",     # New York-Newark-Jersey City
    "lax": "CUURS49ASA0",     # Los Angeles-Long Beach-Anaheim
    "chi": "CUURS23ASA0",     # Chicago-Naperville-Elgin
    "hou": "CUURS37ASA0",     # Houston-The Woodlands-Sugar Land
    "phx": "CUURS48ASA0",     # Phoenix-Mesa-Chandler
    "phl": "CUURS12BSA0",     # Philadelphia-Camden-Wilmington
    "sdg": "CUURS49BSA0",     # San Diego-Chula Vista-Carlsbad
    "dal": "CUURS37BSA0",     # Dallas-Fort Worth-Arlington
    "sfo": "CUURS49CSA0",     # San Francisco-Oakland-Berkeley
    "sea": "CUURS30ASA0",     # Seattle-Tacoma-Bellevue
    "den": "CUURS44ASA0",     # Denver-Aurora-Lakewood
    "dca": "CUURS35ASA0",     # Washington-Arlington-Alexandria
    "atl": "CUURS35BSA0",     # Atlanta (not in our 20 but useful reference)
}


def fetch_bls_cpi(series_ids: list[str], start_year: int, end_year: int) -> dict:
    """Fetch CPI series from BLS."""
    payload = {
        "seriesid": series_ids,
        "startyear": str(start_year),
        "endyear": str(end_year),
    }
    resp = requests.post(BLS_API_URL, json=payload, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    results = {}
    for series in data.get("Results", {}).get("series", []):
        series_id = series["seriesID"]
        points = []
        for item in series.get("data", []):
            period = item["period"]
            if not period.startswith("M") or period == "M13":
                continue
            raw_val = item["value"]
            if raw_val in ("-", "", "N/A"):
                continue
            try:
                value = float(raw_val)
            except ValueError:
                continue
            month_num = int(period[1:])
            year = int(item["year"])
            points.append({
                "month": f"{year}-{month_num:02d}",
                "cpi_index": round(value, 3),
            })
        points.sort(key=lambda x: x["month"])
        results[series_id] = points
    return results


def main():
    print("=== BLS CPI Metro Pipeline ===")
    now = datetime.now()
    start_year = now.year - 5
    end_year = now.year

    # Also fetch national CPI for comparison
    national_series = "CUSR0000SA0"  # National all items
    all_series = [national_series] + list(CPI_AREA_MAP.values())

    print(f"Fetching {len(all_series)} CPI series for {start_year}-{end_year}...")
    results = fetch_bls_cpi(all_series, start_year, end_year)

    all_data = {"_national": {"name": "National CPI", "points": results.get(national_series, [])}}
    print(f"  National CPI: {len(results.get(national_series, []))} months")

    for metro_id, series_id in CPI_AREA_MAP.items():
        metro = next((m for m in METROS if m.id == metro_id), None)
        name = metro.name if metro else metro_id
        points = results.get(series_id, [])

        # Compute YoY inflation rate
        if len(points) >= 13:
            for i in range(12, len(points)):
                current = points[i]["cpi_index"]
                year_ago = points[i - 12]["cpi_index"]
                points[i]["inflation_yoy"] = round((current - year_ago) / year_ago * 100, 2)

        all_data[metro_id] = {
            "name": name,
            "seriesId": series_id,
            "points": points,
        }
        print(f"  {name}: {len(points)} months")

    output_path = OUTPUT_DIR / "bls_cpi_metro.json"
    with open(output_path, "w") as f:
        json.dump(all_data, f, indent=2)
    print(f"\nSaved to {output_path}")
    print(f"Metros with CPI data: {sum(1 for k, v in all_data.items() if k != '_national' and v['points'])}/{len(CPI_AREA_MAP)}")


if __name__ == "__main__":
    main()
