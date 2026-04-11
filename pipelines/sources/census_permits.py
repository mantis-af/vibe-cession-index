"""
Census Building Permits pipeline — pulls monthly metro-level building permits.

Source: Census Bureau Building Permits Survey via API.
https://api.census.gov/data/timeseries/bps

No API key required for basic access.

Outputs JSON: { metro_id: { metro, state, months: [{ month, permits }] } }
"""

import json
import sys
import time
from datetime import datetime
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

CENSUS_API_BASE = "https://api.census.gov/data/timeseries/bps"

# Census CBSA FIPS codes for our metros
# These are the core-based statistical area codes used by Census
CBSA_MAP = {
    "nyc": "35620",
    "lax": "31080",
    "chi": "16980",
    "hou": "26420",
    "phx": "38060",
    "phl": "37980",
    "sat": "41700",
    "sdg": "41740",
    "dal": "19100",
    "sjc": "41940",
    "aus": "12420",
    "jax": "27260",
    "sfo": "41860",
    "cmh": "18140",
    "clt": "16740",
    "ind": "26900",
    "sea": "42660",
    "den": "19740",
    "dca": "47900",
    "bna": "34980",
}


def fetch_permits_for_cbsa(cbsa_code: str, start_year: int, end_year: int) -> list[dict]:
    """Fetch monthly building permits for a CBSA from Census API."""
    results = []

    for year in range(start_year, end_year + 1):
        for month in range(1, 13):
            # Don't fetch future months
            if year == end_year and month > datetime.now().month:
                break

            params = {
                "get": "PERMITS",
                "for": f"metropolitan statistical area/micropolitan statistical area:{cbsa_code}",
                "time": f"{year}-{month:02d}",
            }
            try:
                resp = requests.get(CENSUS_API_BASE, params=params, timeout=15)
                if resp.status_code == 200:
                    data = resp.json()
                    # Census API returns [[header...], [values...]]
                    if len(data) > 1:
                        # Find PERMITS column
                        headers = data[0]
                        values = data[1]
                        permits_idx = headers.index("PERMITS") if "PERMITS" in headers else 0
                        permits_val = values[permits_idx]
                        if permits_val and permits_val != "null":
                            results.append({
                                "month": f"{year}-{month:02d}",
                                "permits": int(permits_val),
                            })
                elif resp.status_code == 204:
                    pass  # No data for this period
                time.sleep(0.2)  # Rate limit
            except Exception as e:
                # Silently skip errors for individual months
                pass

    return sorted(results, key=lambda x: x["month"])


def main():
    print("=== Census Building Permits Pipeline ===")
    now = datetime.now()
    start_year = now.year - 1
    end_year = now.year
    print(f"Fetching permits for {start_year}-{end_year}")

    all_data = {}
    for i, metro in enumerate(METROS):
        cbsa = CBSA_MAP.get(metro.id)
        if not cbsa:
            print(f"  [{i+1}/{len(METROS)}] {metro.name}: no CBSA code, skipping")
            continue

        print(f"  [{i+1}/{len(METROS)}] {metro.name} (CBSA {cbsa})...", end=" ")
        months = fetch_permits_for_cbsa(cbsa, start_year, end_year)
        all_data[metro.id] = {
            "metro": metro.name,
            "state": metro.state,
            "months": months,
        }
        print(f"{len(months)} months")

    output_path = OUTPUT_DIR / "census_permits.json"
    with open(output_path, "w") as f:
        json.dump(all_data, f, indent=2)
    print(f"\nSaved to {output_path}")
    print(f"Metros with data: {sum(1 for v in all_data.values() if v.get('months'))}/{len(METROS)}")


if __name__ == "__main__":
    main()
