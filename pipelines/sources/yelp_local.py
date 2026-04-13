"""
Yelp Local Economic Activity pipeline — local business openings/closings.

Source: Yelp Fusion API (free tier, 5000 calls/day).
Tracks the ratio of recently opened vs total businesses per metro.
A closing coffee shop is a vibes signal that FRED can't capture.

Requires YELP_API_KEY environment variable.
"""

import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

YELP_API_KEY = os.environ.get("YELP_API_KEY", "")
YELP_SEARCH_URL = "https://api.yelp.com/v3/businesses/search"

CATEGORIES = ["restaurants", "coffee", "retail", "bars"]


def search_businesses(location: str, attributes: str = "", categories: str = "") -> dict:
    if not YELP_API_KEY:
        return {"total": 0}

    headers = {"Authorization": f"Bearer {YELP_API_KEY}"}
    params = {
        "location": location,
        "limit": 1,
        "categories": categories,
    }
    if attributes:
        params["attributes"] = attributes

    try:
        resp = requests.get(YELP_SEARCH_URL, headers=headers, params=params, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            return {"total": data.get("total", 0)}
    except Exception:
        pass
    return {"total": 0}


def main():
    print("=== Yelp Local Business Activity Pipeline ===")

    if not YELP_API_KEY:
        print("  WARNING: YELP_API_KEY not set. Writing empty output.")
        print("  Set YELP_API_KEY environment variable to enable this pipeline.")
        output_path = OUTPUT_DIR / "yelp_local.json"
        with open(output_path, "w") as f:
            json.dump({"note": "YELP_API_KEY not configured"}, f)
        return

    all_data = {}
    for i, metro in enumerate(METROS):
        location = f"{metro.name}, {metro.state}"
        print(f"  [{i+1}/{len(METROS)}] {location}...")

        total = search_businesses(location, categories=",".join(CATEGORIES))
        time.sleep(0.5)

        new_biz = search_businesses(location, attributes="hot_and_new", categories=",".join(CATEGORIES))
        time.sleep(0.5)

        open_now = search_businesses(location, attributes="open_now", categories=",".join(CATEGORIES))
        time.sleep(0.5)

        total_count = total["total"]
        new_count = new_biz["total"]
        open_count = open_now["total"]

        new_ratio = new_count / total_count if total_count > 0 else 0

        all_data[metro.id] = {
            "metro": metro.name,
            "state": metro.state,
            "total_businesses": total_count,
            "new_businesses": new_count,
            "open_now": open_count,
            "new_ratio": round(new_ratio, 4),
            "fetched_at": datetime.now().isoformat(),
        }
        print(f"    Total: {total_count}, New: {new_count}, Open: {open_count}, Ratio: {new_ratio:.4f}")

    output_path = OUTPUT_DIR / "yelp_local.json"
    with open(output_path, "w") as f:
        json.dump(all_data, f, indent=2)
    print(f"\nSaved to {output_path}")
    print(f"Metros with data: {sum(1 for v in all_data.values() if v.get('total_businesses', 0) > 0)}/{len(METROS)}")


if __name__ == "__main__":
    main()
