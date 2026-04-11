"""
AI Economic Impact pipeline — measures AI-related economic signals by metro.

Two approaches:
1. Google Trends: AI-related job search terms vs traditional job search terms
   - "AI jobs", "machine learning jobs", "prompt engineer" vs "warehouse jobs", "retail jobs"
   - The ratio tells us which metros are pivoting toward AI vs being displaced
2. FRED: Tech employment indicators at state level

Outputs: { metro_id: { ai_job_interest, traditional_job_interest, ai_ratio, ai_trend } }
"""

import json
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

from pytrends.request import TrendReq

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

AI_TERMS = ["AI jobs", "machine learning jobs", "ChatGPT", "prompt engineer", "remote tech jobs"]
TRADITIONAL_TERMS = ["warehouse jobs", "retail jobs", "restaurant jobs", "construction jobs", "truck driver jobs"]


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


def main():
    print("=== AI Economic Impact Pipeline ===")
    end = datetime.now()
    start = end - timedelta(days=365)
    timeframe = f"{start.strftime('%Y-%m-%d')} {end.strftime('%Y-%m-%d')}"
    print(f"Timeframe: {timeframe}")

    pytrends = TrendReq(hl="en-US", tz=360)
    all_data = {}

    for i, metro in enumerate(METROS):
        geo = f"US-{metro.state}-{metro.google_dma}"
        print(f"[{i+1}/{len(METROS)}] {metro.name} ({geo})")

        # Fetch AI terms
        print(f"    AI terms...")
        ai_data = fetch_batch(pytrends, AI_TERMS, geo, timeframe)
        time.sleep(3)

        # Fetch traditional terms
        print(f"    Traditional terms...")
        trad_data = fetch_batch(pytrends, TRADITIONAL_TERMS, geo, timeframe)
        time.sleep(3)

        # Merge and compute ratios
        all_weeks = sorted(set(list(ai_data.keys()) + list(trad_data.keys())))
        weeks = []
        for week_str in all_weeks:
            ai_vals = ai_data.get(week_str, {})
            trad_vals = trad_data.get(week_str, {})

            ai_avg = sum(ai_vals.values()) / max(len(ai_vals), 1) if ai_vals else 0
            trad_avg = sum(trad_vals.values()) / max(len(trad_vals), 1) if trad_vals else 0
            total = ai_avg + trad_avg

            weeks.append({
                "week": week_str,
                "ai_interest": round(ai_avg, 2),
                "traditional_interest": round(trad_avg, 2),
                "ai_ratio": round(ai_avg / total, 4) if total > 0 else 0.5,
            })

        # Compute trend: is AI ratio increasing over time?
        if len(weeks) >= 8:
            recent_ratio = sum(w["ai_ratio"] for w in weeks[-4:]) / 4
            prior_ratio = sum(w["ai_ratio"] for w in weeks[-8:-4]) / 4
            ai_momentum = round(recent_ratio - prior_ratio, 4)
        else:
            ai_momentum = 0

        all_data[metro.id] = {
            "metro": metro.name,
            "state": metro.state,
            "weeks": weeks,
            "aiMomentum": ai_momentum,
            "latestAiRatio": weeks[-1]["ai_ratio"] if weeks else 0,
        }
        print(f"    => {len(weeks)} weeks, AI ratio: {all_data[metro.id]['latestAiRatio']:.3f}, momentum: {ai_momentum:+.4f}")

        if i < len(METROS) - 1:
            time.sleep(5)

    output_path = OUTPUT_DIR / "ai_impact.json"
    with open(output_path, "w") as f:
        json.dump(all_data, f, indent=2)

    # Summary
    metros_sorted = sorted(all_data.values(), key=lambda x: x["latestAiRatio"], reverse=True)
    print(f"\nSaved to {output_path}")
    print(f"\nTop AI-oriented metros:")
    for m in metros_sorted[:5]:
        print(f"  {m['metro']}: AI ratio {m['latestAiRatio']:.3f}, momentum {m['aiMomentum']:+.4f}")
    print(f"\nMost traditional-oriented:")
    for m in metros_sorted[-5:]:
        print(f"  {m['metro']}: AI ratio {m['latestAiRatio']:.3f}, momentum {m['aiMomentum']:+.4f}")


if __name__ == "__main__":
    main()
