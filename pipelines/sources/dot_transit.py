"""
DOT National Transit Database pipeline — transit ridership by metro.

Source: FTA National Transit Database
Transit ridership is a proxy for commuter economic activity and a signal
for the car-free population. Declining ridership can signal economic distress
or remote work shifts.
"""

import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

NTD_URL = "https://www.transit.dot.gov/sites/fta.dot.gov/files/2024-01/Monthly%20Module%20Adjusted%20Data%20Release.xlsx"

NTD_METRO_MAP = {
    "nyc": "New York", "lax": "Los Angeles", "chi": "Chicago",
    "hou": "Houston", "phx": "Phoenix", "phl": "Philadelphia",
    "sdg": "San Diego", "dal": "Dallas", "sfo": "San Francisco",
    "sea": "Seattle", "den": "Denver", "dca": "Washington",
    "bna": "Nashville", "pdx": "Portland", "atl": "Atlanta",
    "mia": "Miami", "tpa": "Tampa", "min": "Minneapolis",
    "det": "Detroit", "bos": "Boston", "bal": "Baltimore",
    "pit": "Pittsburgh", "cle": "Cleveland", "stl": "St. Louis",
    "slc": "Salt Lake", "las": "Las Vegas", "orl": "Orlando",
    "cin": "Cincinnati", "mil": "Milwaukee", "buf": "Buffalo",
}

FRED_TRANSIT = "TRANSITD11"


def fetch_fred_csv(series_id: str, start_date: str) -> list[dict]:
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}&cosd={start_date}"
    try:
        df = pd.read_csv(url)
        if df.empty:
            return []
        df.columns = ["date", "value"]
        df["value"] = pd.to_numeric(df["value"], errors="coerce")
        df = df.dropna(subset=["value"])
        return [{"date": str(row["date"]), "value": round(float(row["value"]), 2)} for _, row in df.iterrows()]
    except Exception:
        return []


def main():
    print("=== DOT Transit Ridership Pipeline ===")

    print("  Trying NTD monthly data download...")
    ntd_data = {}

    try:
        df = pd.read_excel(NTD_URL, sheet_name=0)
        print(f"    Loaded {len(df)} rows")

        uza_col = None
        for col in df.columns:
            if "uza" in str(col).lower() and "name" in str(col).lower():
                uza_col = col
                break

        if uza_col:
            month_cols = [c for c in df.columns if "/" in str(c) or "-" in str(c)]
            if not month_cols:
                month_cols = [c for c in df.columns if str(c).replace(".", "").isdigit()]

            for metro_id, uza_name in NTD_METRO_MAP.items():
                metro_rows = df[df[uza_col].astype(str).str.contains(uza_name, case=False, na=False)]
                if metro_rows.empty:
                    continue
                points = []
                for mc in month_cols[-24:]:
                    total = pd.to_numeric(metro_rows[mc], errors="coerce").sum()
                    if total > 0:
                        points.append({
                            "month": str(mc),
                            "ridership": int(total),
                        })
                if points:
                    ntd_data[metro_id] = points
                    print(f"    {uza_name}: {len(points)} months")
    except Exception as e:
        print(f"    NTD download failed: {e}")

    if not ntd_data:
        print("  Falling back to FRED transit data...")
        start = (datetime.now() - timedelta(days=730)).strftime("%Y-%m-%d")
        national = fetch_fred_csv(FRED_TRANSIT, start)
        if national:
            print(f"    National transit index: {len(national)} points")
            ntd_data["_national"] = national

    metro_transit = {}
    for metro in METROS:
        if metro.id in ntd_data:
            metro_transit[metro.id] = {
                "metro": metro.name,
                "state": metro.state,
                "points": ntd_data[metro.id],
            }
        else:
            metro_transit[metro.id] = {
                "metro": metro.name,
                "state": metro.state,
                "points": ntd_data.get("_national", []),
                "note": "national index fallback",
            }

    output_path = OUTPUT_DIR / "dot_transit.json"
    with open(output_path, "w") as f:
        json.dump(metro_transit, f, indent=2)
    print(f"\nSaved to {output_path}")
    print(f"Metros with local data: {sum(1 for v in metro_transit.values() if not v.get('note'))}/{len(METROS)}")


if __name__ == "__main__":
    main()
