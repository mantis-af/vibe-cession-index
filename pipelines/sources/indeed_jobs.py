"""
Indeed Hiring Lab pipeline — pulls metro-level job posting trends.

Indeed Hiring Lab publishes a free CSV of job postings indexed to Feb 1, 2020 = 100.
Source: https://raw.githubusercontent.com/hiring-lab/hiring-lab-data-releases/master/US/metro_job_postings_us.csv

Outputs JSON: { metro_id: { metro, state, weeks: [{ week, postings_index, postings_yoy }] } }
"""

import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

INDEED_CSV_URL = "https://raw.githubusercontent.com/hiring-lab/hiring-lab-data-releases/master/US/metro_job_postings_us.csv"

# Map our metros to Indeed metro names (Indeed uses MSA names)
INDEED_METRO_MAP = {
    "nyc": "New York",
    "lax": "Los Angeles",
    "chi": "Chicago",
    "hou": "Houston",
    "phx": "Phoenix",
    "phl": "Philadelphia",
    "sat": "San Antonio",
    "sdg": "San Diego",
    "dal": "Dallas",
    "sjc": "San Jose",
    "aus": "Austin",
    "jax": "Jacksonville",
    "sfo": "San Francisco",
    "cmh": "Columbus",
    "clt": "Charlotte",
    "ind": "Indianapolis",
    "sea": "Seattle",
    "den": "Denver",
    "dca": "Washington",
    "bna": "Nashville",
}


def main():
    print("=== Indeed Hiring Lab Pipeline ===")
    cutoff = (datetime.now() - timedelta(days=400)).strftime("%Y-%m-%d")

    print(f"Downloading Indeed Hiring Lab data...")
    try:
        df = pd.read_csv(INDEED_CSV_URL)
    except Exception as e:
        print(f"  Failed to download: {e}")
        print("  Trying alternative URL format...")
        # Try alternate URL patterns
        alt_urls = [
            "https://raw.githubusercontent.com/hiring-lab/hiring-lab-data-releases/master/US/metro_job_postings.csv",
            "https://raw.githubusercontent.com/hiring-lab/hiring-lab-data-releases/master/US/aggregate_job_postings_US.csv",
        ]
        df = None
        for url in alt_urls:
            try:
                df = pd.read_csv(url)
                print(f"  Loaded from {url}")
                break
            except Exception:
                continue
        if df is None:
            print("  Could not download Indeed data from any URL")
            # Write empty output
            output_path = OUTPUT_DIR / "indeed_jobs.json"
            with open(output_path, "w") as f:
                json.dump({}, f)
            return

    print(f"  Loaded {len(df)} rows")
    print(f"  Columns: {list(df.columns)}")

    # Indeed data has a 'date' column and metro columns, or 'metro' column with 'date' and values
    # Detect format
    if "date" in df.columns and "metro" in df.columns:
        # Long format: date, metro, value columns
        print("  Format: long (date, metro, value)")
        date_col = "date"
        metro_col = "metro"
        # Find the value column
        value_cols = [c for c in df.columns if c not in ("date", "metro", "Unnamed: 0")]
        value_col = value_cols[0] if value_cols else None
        if not value_col:
            print("  Could not identify value column")
            return

        df[date_col] = pd.to_datetime(df[date_col])
        df = df[df[date_col] >= cutoff]

        all_data = {}
        for metro in METROS:
            indeed_name = INDEED_METRO_MAP.get(metro.id)
            if not indeed_name:
                continue

            # Fuzzy match metro name
            metro_df = df[df[metro_col].str.contains(indeed_name, case=False, na=False)].copy()
            if metro_df.empty:
                print(f"  {metro.name}: not found in Indeed data")
                continue

            metro_df = metro_df.sort_values(date_col)
            weeks = []
            for _, row in metro_df.iterrows():
                week_str = row[date_col].strftime("%Y-%m-%d")
                val = row[value_col]
                if pd.notna(val):
                    weeks.append({
                        "week": week_str,
                        "postings_index": round(float(val), 2),
                    })

            # Resample to weekly if daily
            if len(weeks) > 60:
                # Daily data — resample to weekly
                weekly = {}
                for w in weeks:
                    # Get the Monday of this week
                    dt = datetime.strptime(w["week"], "%Y-%m-%d")
                    monday = dt - timedelta(days=dt.weekday())
                    monday_str = monday.strftime("%Y-%m-%d")
                    if monday_str not in weekly:
                        weekly[monday_str] = []
                    weekly[monday_str].append(w["postings_index"])
                weeks = [
                    {"week": wk, "postings_index": round(sum(vals) / len(vals), 2)}
                    for wk, vals in sorted(weekly.items())
                ]

            all_data[metro.id] = {
                "metro": metro.name,
                "state": metro.state,
                "weeks": weeks,
            }
            print(f"  {metro.name}: {len(weeks)} weeks")

    elif "date" in df.columns:
        # Wide format: date column + metro name columns
        print("  Format: wide (date + metro columns)")
        df["date"] = pd.to_datetime(df["date"])
        df = df[df["date"] >= cutoff]

        all_data = {}
        for metro in METROS:
            indeed_name = INDEED_METRO_MAP.get(metro.id)
            if not indeed_name:
                continue

            # Find matching column
            matching_cols = [c for c in df.columns if indeed_name.lower() in c.lower()]
            if not matching_cols:
                print(f"  {metro.name}: no matching column")
                continue

            col = matching_cols[0]
            metro_df = df[["date", col]].dropna()
            weeks = []
            for _, row in metro_df.iterrows():
                weeks.append({
                    "week": row["date"].strftime("%Y-%m-%d"),
                    "postings_index": round(float(row[col]), 2),
                })

            # Resample to weekly if needed
            if len(weeks) > 60:
                weekly = {}
                for w in weeks:
                    dt = datetime.strptime(w["week"], "%Y-%m-%d")
                    monday = dt - timedelta(days=dt.weekday())
                    monday_str = monday.strftime("%Y-%m-%d")
                    if monday_str not in weekly:
                        weekly[monday_str] = []
                    weekly[monday_str].append(w["postings_index"])
                weeks = [
                    {"week": wk, "postings_index": round(sum(vals) / len(vals), 2)}
                    for wk, vals in sorted(weekly.items())
                ]

            all_data[metro.id] = {
                "metro": metro.name,
                "state": metro.state,
                "weeks": weeks,
            }
            print(f"  {metro.name}: {len(weeks)} weeks")
    else:
        print(f"  Unknown format. Columns: {list(df.columns)}")
        all_data = {}

    output_path = OUTPUT_DIR / "indeed_jobs.json"
    with open(output_path, "w") as f:
        json.dump(all_data, f, indent=2)
    print(f"\nSaved to {output_path}")
    print(f"Metros with data: {sum(1 for v in all_data.values() if v.get('weeks'))}/{len(METROS)}")


if __name__ == "__main__":
    main()
