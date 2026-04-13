"""
Apartment List rent estimates pipeline — independent metro rent data.

Source: Apartment List Research
Monthly rent estimates + vacancy rates by metro. Independent methodology
from Zillow ZORI — cross-validates and adds vacancy rate signal.
"""

import json
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

AL_RENT_URL = "https://www.apartmentlist.com/research/hubfs/Data/rent_estimates_msa.csv"
AL_VACANCY_URL = "https://www.apartmentlist.com/research/hubfs/Data/vacancy_index_msa.csv"

AL_METRO_MAP = {m.id: f"{m.name}, {m.state}" for m in METROS}
AL_METRO_MAP["dca"] = "Washington, DC"


def try_download(urls: list[str]) -> pd.DataFrame | None:
    for url in urls:
        try:
            df = pd.read_csv(url)
            if not df.empty:
                return df
        except Exception:
            continue
    return None


def main():
    print("=== Apartment List Rent Estimates Pipeline ===")

    print("  Downloading rent estimates...")
    rent_urls = [
        AL_RENT_URL,
        "https://www.apartmentlist.com/research/hubfs/Data/rent_estimates_metro.csv",
        "https://www.apartmentlist.com/research/hubfs/rent_estimates.csv",
    ]
    rent_df = try_download(rent_urls)

    print("  Downloading vacancy rates...")
    vacancy_urls = [
        AL_VACANCY_URL,
        "https://www.apartmentlist.com/research/hubfs/Data/vacancy_index_metro.csv",
        "https://www.apartmentlist.com/research/hubfs/vacancy_index.csv",
    ]
    vacancy_df = try_download(vacancy_urls)

    all_data = {}

    if rent_df is not None:
        print(f"  Rent data: {len(rent_df)} rows, columns: {list(rent_df.columns)[:8]}")

        loc_col = None
        for col in rent_df.columns:
            if any(kw in col.lower() for kw in ["location", "msa", "metro", "name", "region"]):
                loc_col = col
                break
        if not loc_col:
            loc_col = rent_df.columns[0]

        meta_cols = [c for c in rent_df.columns if not c[0].isdigit() and "-" not in c[:5]]
        date_cols = [c for c in rent_df.columns if c not in meta_cols]
        if not date_cols:
            date_cols = list(rent_df.columns[3:])
        recent_dates = sorted(date_cols)[-24:]

        for metro in METROS:
            row = rent_df[rent_df[loc_col].astype(str).str.contains(metro.name, case=False, na=False)]
            if row.empty:
                continue

            row = row.iloc[0]
            points = []
            for date_col in recent_dates:
                val = row.get(date_col)
                if pd.notna(val):
                    try:
                        points.append({
                            "month": str(date_col)[:7],
                            "rent_estimate": round(float(val), 0),
                        })
                    except (ValueError, TypeError):
                        pass

            for i in range(12, len(points)):
                current = points[i]["rent_estimate"]
                year_ago = points[i - 12]["rent_estimate"]
                if year_ago > 0:
                    points[i]["yoy_pct"] = round((current - year_ago) / year_ago * 100, 2)

            all_data[metro.id] = {
                "metro": metro.name,
                "state": metro.state,
                "points": points,
            }
            latest = points[-1] if points else {}
            print(f"    {metro.name}: {len(points)} months, ${latest.get('rent_estimate', 0):,.0f}/mo")
    else:
        print("  Could not download rent estimates from any URL")

    if vacancy_df is not None:
        print(f"\n  Vacancy data: {len(vacancy_df)} rows")
        loc_col = vacancy_df.columns[0]
        date_cols = list(vacancy_df.columns[1:])
        recent_dates = sorted(date_cols)[-24:]

        for metro in METROS:
            row = vacancy_df[vacancy_df[loc_col].astype(str).str.contains(metro.name, case=False, na=False)]
            if row.empty or metro.id not in all_data:
                continue
            row = row.iloc[0]
            for date_col in recent_dates:
                val = row.get(date_col)
                if pd.notna(val):
                    month = str(date_col)[:7]
                    for pt in all_data[metro.id]["points"]:
                        if pt["month"] == month:
                            pt["vacancy_rate"] = round(float(val), 2)
                            break

    output_path = OUTPUT_DIR / "apartment_list.json"
    with open(output_path, "w") as f:
        json.dump(all_data, f, indent=2)
    print(f"\nSaved to {output_path}")
    print(f"Metros with data: {sum(1 for v in all_data.values() if v.get('points'))}/{len(METROS)}")


if __name__ == "__main__":
    main()
