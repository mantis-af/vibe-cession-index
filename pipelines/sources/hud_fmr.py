"""
HUD Fair Market Rents pipeline — official rent benchmarks by metro.

Source: HUD User API — https://www.huduser.gov/portal/dataset/fmr-api.html
FMRs set the standard for "affordable" rent per HUD definition.
Annual data by metro and bedroom count. No API key required for basic access.
"""

import json
import sys
import time
from datetime import datetime
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

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

HUD_API = "https://www.huduser.gov/hudapi/public/fmr/data"


def fetch_fmr(cbsa: str, year: int) -> dict | None:
    entity_id = f"METRO{cbsa}M{cbsa}"
    url = f"{HUD_API}/{entity_id}"
    params = {"year": year}
    try:
        resp = requests.get(url, params=params, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            if "data" in data and "basicdata" in data["data"]:
                bd = data["data"]["basicdata"]
                return {
                    "efficiency": bd.get("Efficiency", bd.get("efficiency")),
                    "one_bedroom": bd.get("One-Bedroom", bd.get("one_bedroom")),
                    "two_bedroom": bd.get("Two-Bedroom", bd.get("two_bedroom")),
                    "three_bedroom": bd.get("Three-Bedroom", bd.get("three_bedroom")),
                    "four_bedroom": bd.get("Four-Bedroom", bd.get("four_bedroom")),
                }
    except Exception:
        pass
    try:
        url2 = f"https://www.huduser.gov/hudapi/public/fmr/statedata/{cbsa}"
        resp = requests.get(url2, params={"year": year}, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            if "data" in data:
                return data["data"]
    except Exception:
        pass
    return None


def main():
    print("=== HUD Fair Market Rents Pipeline ===")
    current_year = datetime.now().year
    years = [current_year - 1, current_year]

    all_data = {}
    for i, metro in enumerate(METROS):
        cbsa = CBSA_MAP.get(metro.id)
        if not cbsa:
            print(f"  [{i+1}/{len(METROS)}] {metro.name}: no CBSA, skipping")
            continue

        print(f"  [{i+1}/{len(METROS)}] {metro.name}...", end=" ")
        points = []
        for year in years:
            result = fetch_fmr(cbsa, year)
            if result:
                result["year"] = year
                points.append(result)
            time.sleep(0.3)

        all_data[metro.id] = {
            "metro": metro.name,
            "state": metro.state,
            "points": points,
        }
        status = f"{len(points)} years" if points else "no data"
        two_br = points[-1].get("two_bedroom", "N/A") if points else "N/A"
        print(f"{status}, 2BR FMR: ${two_br}")

    output_path = OUTPUT_DIR / "hud_fmr.json"
    with open(output_path, "w") as f:
        json.dump(all_data, f, indent=2)
    print(f"\nSaved to {output_path}")
    print(f"Metros with data: {sum(1 for v in all_data.values() if v['points'])}/{len(METROS)}")


if __name__ == "__main__":
    main()
