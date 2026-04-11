"""
Google Trends pipeline — pulls distress vs aspiration search interest by metro DMA.

Uses pytrends with geo code format US-{STATE}-{DMA} (e.g. US-NY-501 for NYC).
Batches up to 5 terms per request to minimize API calls.

Outputs JSON: { metro_id: { metro, state, weeks: [{ week, distress, aspiration, anxiety_ratio }] } }
"""

import json
import time
import sys
from datetime import datetime, timedelta
from pathlib import Path

from pytrends.request import TrendReq

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, DISTRESS_TERMS, ASPIRATION_TERMS, OUTPUT_DIR


def fetch_batch(pytrends: TrendReq, terms: list[str], geo: str, timeframe: str) -> dict[str, dict[str, float]]:
    """Fetch up to 5 terms in one request. Returns {week_str: {term: value}}."""
    weekly: dict[str, dict[str, float]] = {}
    try:
        pytrends.build_payload(terms, timeframe=timeframe, geo=geo)
        df = pytrends.interest_over_time()
        if df is not None and not df.empty:
            for col in terms:
                if col in df.columns:
                    for date, value in df[col].items():
                        week_str = date.strftime("%Y-%m-%d")
                        if week_str not in weekly:
                            weekly[week_str] = {}
                        weekly[week_str][col] = float(value)
    except Exception as e:
        print(f"    Warning: batch failed for {geo}: {e}")
    return weekly


def fetch_metro_anxiety(pytrends: TrendReq, metro, timeframe: str) -> list[dict]:
    """Fetch distress and aspiration signals for a metro, return weekly timeseries."""
    geo = f"US-{metro.state}-{metro.google_dma}"

    # Batch distress terms (up to 5 per request)
    print(f"    Fetching distress terms...")
    distress_data = fetch_batch(pytrends, DISTRESS_TERMS, geo, timeframe)
    time.sleep(3)

    # Batch aspiration terms
    print(f"    Fetching aspiration terms...")
    aspiration_data = fetch_batch(pytrends, ASPIRATION_TERMS, geo, timeframe)
    time.sleep(3)

    # Merge into weekly timeseries
    all_weeks = sorted(set(list(distress_data.keys()) + list(aspiration_data.keys())))

    result = []
    for week_str in all_weeks:
        d_vals = distress_data.get(week_str, {})
        a_vals = aspiration_data.get(week_str, {})

        distress_avg = sum(d_vals.values()) / max(len(d_vals), 1) if d_vals else 0
        aspiration_avg = sum(a_vals.values()) / max(len(a_vals), 1) if a_vals else 0
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
    print(f"Distress terms: {DISTRESS_TERMS}")
    print(f"Aspiration terms: {ASPIRATION_TERMS}")
    print()

    pytrends = TrendReq(hl="en-US", tz=360)
    all_data = {}

    for i, metro in enumerate(METROS):
        geo = f"US-{metro.state}-{metro.google_dma}"
        print(f"[{i+1}/{len(METROS)}] {metro.name}, {metro.state} (geo={geo})")
        weekly = fetch_metro_anxiety(pytrends, metro, timeframe)
        all_data[metro.id] = {
            "metro": metro.name,
            "state": metro.state,
            "weeks": weekly,
        }
        print(f"    => {len(weekly)} weeks of data")

        # Rate limit between metros
        if i < len(METROS) - 1:
            time.sleep(5)

    output_path = OUTPUT_DIR / "google_trends.json"
    with open(output_path, "w") as f:
        json.dump(all_data, f, indent=2)

    metros_with_data = sum(1 for v in all_data.values() if v["weeks"])
    print(f"\nSaved to {output_path}")
    print(f"Metros with data: {metros_with_data}/{len(METROS)}")


if __name__ == "__main__":
    main()
