"""
Google Trends pipeline — pulls distress vs aspiration search interest by metro DMA.

Outputs a JSON file: { metro_id: { week: "YYYY-MM-DD", distress: float, aspiration: float, anxiety_ratio: float } }
The anxiety_ratio = distress / (distress + aspiration) — higher means more economic anxiety.
"""

import json
import time
import sys
from datetime import datetime, timedelta
from pathlib import Path

from pytrends.request import TrendReq

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, DISTRESS_TERMS, ASPIRATION_TERMS, OUTPUT_DIR


def fetch_trends_for_metro(pytrends: TrendReq, geo_code: str, terms: list[str], timeframe: str) -> dict[str, float]:
    """Fetch average search interest for a list of terms in a geo."""
    results = {}
    for term in terms:
        try:
            pytrends.build_payload([term], timeframe=timeframe, geo=geo_code)
            df = pytrends.interest_over_time()
            if df is not None and not df.empty and term in df.columns:
                # Get weekly averages — df index is weekly dates
                weekly = df[term].to_dict()
                for date, value in weekly.items():
                    week_str = date.strftime("%Y-%m-%d")
                    if week_str not in results:
                        results[week_str] = {"distress": 0, "aspiration": 0, "distress_count": 0, "aspiration_count": 0}
            time.sleep(1)  # Rate limit
        except Exception as e:
            print(f"  Warning: failed for '{term}' in {geo_code}: {e}")
            time.sleep(5)
    return results


def fetch_metro_anxiety(pytrends: TrendReq, metro, timeframe: str) -> list[dict]:
    """Fetch distress and aspiration signals for a metro, return weekly timeseries."""
    geo = f"US-{metro.google_dma}"
    weekly_data: dict[str, dict] = {}

    # Fetch distress terms
    for term in DISTRESS_TERMS:
        try:
            pytrends.build_payload([term], timeframe=timeframe, geo=geo)
            df = pytrends.interest_over_time()
            if df is not None and not df.empty and term in df.columns:
                for date, value in df[term].items():
                    week_str = date.strftime("%Y-%m-%d")
                    if week_str not in weekly_data:
                        weekly_data[week_str] = {"distress_sum": 0, "distress_n": 0, "aspiration_sum": 0, "aspiration_n": 0}
                    weekly_data[week_str]["distress_sum"] += float(value)
                    weekly_data[week_str]["distress_n"] += 1
            time.sleep(2)
        except Exception as e:
            print(f"  Warning: distress term '{term}' failed for {metro.name}: {e}")
            time.sleep(10)

    # Fetch aspiration terms
    for term in ASPIRATION_TERMS:
        try:
            pytrends.build_payload([term], timeframe=timeframe, geo=geo)
            df = pytrends.interest_over_time()
            if df is not None and not df.empty and term in df.columns:
                for date, value in df[term].items():
                    week_str = date.strftime("%Y-%m-%d")
                    if week_str not in weekly_data:
                        weekly_data[week_str] = {"distress_sum": 0, "distress_n": 0, "aspiration_sum": 0, "aspiration_n": 0}
                    weekly_data[week_str]["aspiration_sum"] += float(value)
                    weekly_data[week_str]["aspiration_n"] += 1
            time.sleep(2)
        except Exception as e:
            print(f"  Warning: aspiration term '{term}' failed for {metro.name}: {e}")
            time.sleep(10)

    # Compute weekly averages
    result = []
    for week_str in sorted(weekly_data.keys()):
        d = weekly_data[week_str]
        distress_avg = d["distress_sum"] / max(d["distress_n"], 1)
        aspiration_avg = d["aspiration_sum"] / max(d["aspiration_n"], 1)
        total = distress_avg + aspiration_avg
        anxiety_ratio = distress_avg / total if total > 0 else 0.5
        result.append({
            "week": week_str,
            "distress": round(distress_avg, 2),
            "aspiration": round(aspiration_avg, 2),
            "anxiety_ratio": round(anxiety_ratio, 4),
        })
    return result


def main():
    print("=== Google Trends Pipeline ===")
    # 12-month lookback
    end = datetime.now()
    start = end - timedelta(days=365)
    timeframe = f"{start.strftime('%Y-%m-%d')} {end.strftime('%Y-%m-%d')}"
    print(f"Timeframe: {timeframe}")

    pytrends = TrendReq(hl="en-US", tz=360, retries=3, backoff_factor=2)
    all_data = {}

    for metro in METROS:
        print(f"Fetching: {metro.name}, {metro.state} (DMA {metro.google_dma})...")
        weekly = fetch_metro_anxiety(pytrends, metro, timeframe)
        all_data[metro.id] = {
            "metro": metro.name,
            "state": metro.state,
            "weeks": weekly,
        }
        print(f"  Got {len(weekly)} weeks of data")
        time.sleep(3)  # Be respectful to Google

    output_path = OUTPUT_DIR / "google_trends.json"
    with open(output_path, "w") as f:
        json.dump(all_data, f, indent=2)
    print(f"\nSaved to {output_path}")
    print(f"Metros with data: {sum(1 for v in all_data.values() if v['weeks'])}/{len(METROS)}")


if __name__ == "__main__":
    main()
