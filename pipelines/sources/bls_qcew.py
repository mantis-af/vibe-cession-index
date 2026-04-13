"""
BLS Quarterly Census of Employment & Wages (QCEW) pipeline.

Source: BLS QCEW API — average weekly wages by metro (CBSA).
https://data.bls.gov/cew/data/api/

Tells us whether workers in each metro are actually earning more or less —
income growth vs inflation tells you if people are actually getting ahead.
"""

import json
import sys
import time
import csv
import io
from datetime import datetime
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

QCEW_API = "https://data.bls.gov/cew/data/api"

CBSA_MAP = {
    "nyc": "35620", "lax": "31080", "chi": "16980", "hou": "26420",
    "phx": "38060", "phl": "37980", "sat": "41700", "sdg": "41740",
    "dal": "19100", "sjc": "41940", "aus": "12420", "jax": "27260",
    "sfo": "41860", "cmh": "18140", "clt": "16740", "ind": "26900",
    "sea": "42660", "den": "19740", "dca": "47900", "bna": "34980",
    "ftw": "19100", "okc": "36420", "elp": "21340", "las": "29820",
    "pdx": "38900", "mem": "32820", "lou": "31140", "bal": "12580",
    "mil": "33340", "abq": "10740", "tuc": "46060", "msa": "38060",
    "atl": "12060", "kcm": "28140", "ral": "39580", "mia": "33100",
    "tpa": "45300", "stl": "41180", "pit": "38300", "cin": "17140",
    "orl": "36740", "cle": "17460", "min": "33460", "det": "19820",
    "slc": "41620", "bos": "14460", "ric": "40060", "bir": "13820",
    "har": "25540", "buf": "15380",
}


def fetch_qcew_area(area_fips: str, year: int, qtr: str) -> dict | None:
    url = f"{QCEW_API}/{year}/{qtr}/area/{area_fips}.csv"
    try:
        resp = requests.get(url, timeout=15)
        if resp.status_code != 200:
            return None
        reader = csv.DictReader(io.StringIO(resp.text))
        for row in reader:
            if row.get("own_code") == "5" and row.get("industry_code") == "10":
                avg_wkly = row.get("avg_wkly_wage", "")
                total_emp = row.get("month3_emplvl", "")
                if avg_wkly and avg_wkly != "0":
                    return {
                        "avg_weekly_wage": int(avg_wkly),
                        "employment": int(total_emp) if total_emp else None,
                    }
    except Exception:
        pass
    return None


def main():
    print("=== BLS QCEW Pipeline — Metro Average Weekly Wages ===")
    now = datetime.now()
    years = [now.year - 2, now.year - 1, now.year]
    quarters = ["1", "2", "3", "4"]

    all_data = {}
    for i, metro in enumerate(METROS):
        cbsa = CBSA_MAP.get(metro.id)
        if not cbsa:
            print(f"  [{i+1}/{len(METROS)}] {metro.name}: no CBSA code, skipping")
            continue

        area_fips = f"C{cbsa}"
        print(f"  [{i+1}/{len(METROS)}] {metro.name} (CBSA {cbsa})...", end=" ")

        points = []
        for year in years:
            for qtr in quarters:
                if year == now.year and int(qtr) > (now.month - 1) // 3 + 1:
                    break
                result = fetch_qcew_area(area_fips, year, qtr)
                if result:
                    points.append({
                        "quarter": f"{year}-Q{qtr}",
                        "avg_weekly_wage": result["avg_weekly_wage"],
                        "employment": result["employment"],
                    })
                time.sleep(0.3)

        for idx in range(4, len(points)):
            current = points[idx]["avg_weekly_wage"]
            year_ago = points[idx - 4]["avg_weekly_wage"]
            if year_ago > 0:
                points[idx]["wage_growth_yoy"] = round((current - year_ago) / year_ago * 100, 2)

        all_data[metro.id] = {
            "metro": metro.name,
            "state": metro.state,
            "points": points,
        }
        print(f"{len(points)} quarters")

    output_path = OUTPUT_DIR / "bls_qcew.json"
    with open(output_path, "w") as f:
        json.dump(all_data, f, indent=2)
    print(f"\nSaved to {output_path}")
    print(f"Metros with data: {sum(1 for v in all_data.values() if v['points'])}/{len(METROS)}")


if __name__ == "__main__":
    main()
