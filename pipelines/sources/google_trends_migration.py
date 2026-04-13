"""
Google Trends migration intent pipeline — tracks people considering relocation.

"Moving to {city}", "cost of living", "best places to live" searches
reveal which metros people are fleeing vs. flocking to.
"""

import json
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

from pytrends.request import TrendReq

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, MIGRATION_TERMS, OUTPUT_DIR


def main():
    print("=== Google Trends Migration Intent Pipeline ===")
    end = datetime.now()
    start = end - timedelta(days=365)
    timeframe = f"{start.strftime('%Y-%m-%d')} {end.strftime('%Y-%m-%d')}"
    print(f"Timeframe: {timeframe}")
    print(f"Terms: {MIGRATION_TERMS}")

    pytrends = TrendReq(hl="en-US", tz=360)
    all_data = {}

    for i, metro in enumerate(METROS):
        geo = f"US-{metro.state}-{metro.google_dma}"
        print(f"[{i+1}/{len(METROS)}] {metro.name} ({geo})")

        weekly: dict[str, dict[str, float]] = {}
        try:
            pytrends.build_payload(MIGRATION_TERMS, timeframe=timeframe, geo=geo)
            df = pytrends.interest_over_time()
            if df is not None and not df.empty:
                for col in MIGRATION_TERMS:
                    if col in df.columns:
                        for date, value in df[col].items():
                            week_str = date.strftime("%Y-%m-%d")
                            if week_str not in weekly:
                                weekly[week_str] = {}
                            weekly[week_str][col] = float(value)
        except Exception as e:
            print(f"    Warning: {e}")

        weeks = []
        for week_str in sorted(weekly.keys()):
            vals = weekly[week_str]
            avg = sum(vals.values()) / max(len(vals), 1)
            weeks.append({
                "week": week_str,
                "migration_index": round(avg, 2),
                "term_count": len(vals),
            })

        all_data[metro.id] = {
            "metro": metro.name,
            "state": metro.state,
            "weeks": weeks,
        }
        print(f"    => {len(weeks)} weeks")

        if i < len(METROS) - 1:
            time.sleep(5)

    output_path = OUTPUT_DIR / "google_trends_migration.json"
    with open(output_path, "w") as f:
        json.dump(all_data, f, indent=2)
    print(f"\nSaved to {output_path}")
    print(f"Metros with data: {sum(1 for v in all_data.values() if v['weeks'])}/{len(METROS)}")


if __name__ == "__main__":
    main()
