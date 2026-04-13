"""
Reddit economic sentiment pipeline — subreddit-level economic mood.

Source: Reddit JSON API (no auth needed for public subreddits).
Analyzes post titles from economy-related subreddits for sentiment keywords.
Google Trends shows what people search; Reddit shows how they talk and feel.
"""

import json
import sys
import time
from datetime import datetime
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

NATIONAL_SUBS = [
    "personalfinance",
    "economy",
    "povertyfinance",
    "antiwork",
    "financialindependence",
    "jobs",
]

METRO_SUBS = {
    "nyc": ["nyc", "newyorkcity"],
    "lax": ["LosAngeles"],
    "chi": ["chicago"],
    "hou": ["houston"],
    "phx": ["phoenix"],
    "phl": ["philadelphia"],
    "sdg": ["sandiego"],
    "dal": ["Dallas"],
    "aus": ["Austin"],
    "sfo": ["sanfrancisco"],
    "sea": ["Seattle"],
    "den": ["Denver"],
    "dca": ["washingtondc"],
    "bna": ["nashville"],
    "pdx": ["Portland"],
    "atl": ["Atlanta"],
    "mia": ["Miami"],
    "tpa": ["tampa"],
    "min": ["Minneapolis"],
    "det": ["Detroit"],
    "bos": ["boston"],
    "clt": ["Charlotte"],
    "las": ["vegaslocals"],
    "orl": ["orlando"],
}

DISTRESS_WORDS = {
    "laid off", "layoff", "fired", "unemployed", "can't afford", "struggling",
    "behind on rent", "eviction", "food bank", "debt", "broke", "paycheck to paycheck",
    "cost of living", "inflation", "rent increase", "priced out", "homeless",
    "overworked", "underpaid", "burnout", "quitting", "toxic job", "no savings",
}
OPTIMISM_WORDS = {
    "new job", "got hired", "promotion", "raise", "salary increase", "pay raise",
    "buying a house", "first home", "saving", "investing", "side hustle success",
    "debt free", "paid off", "emergency fund", "financial freedom", "dream job",
}

HEADERS = {"User-Agent": "UndercurrentBot/1.0 (economic research)"}


def fetch_subreddit_posts(subreddit: str, limit: int = 100) -> list[dict]:
    url = f"https://www.reddit.com/r/{subreddit}/new.json"
    params = {"limit": min(limit, 100), "t": "month"}
    try:
        resp = requests.get(url, params=params, headers=HEADERS, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            posts = []
            for child in data.get("data", {}).get("children", []):
                post = child.get("data", {})
                posts.append({
                    "title": post.get("title", ""),
                    "score": post.get("score", 0),
                    "created": post.get("created_utc", 0),
                    "num_comments": post.get("num_comments", 0),
                })
            return posts
    except Exception:
        pass
    return []


def compute_sentiment(posts: list[dict]) -> dict:
    if not posts:
        return {"distress_count": 0, "optimism_count": 0, "total_posts": 0, "sentiment_ratio": 0.5}

    distress_count = 0
    optimism_count = 0

    for post in posts:
        title_lower = post["title"].lower()
        for word in DISTRESS_WORDS:
            if word in title_lower:
                distress_count += 1
                break
        for word in OPTIMISM_WORDS:
            if word in title_lower:
                optimism_count += 1
                break

    total = distress_count + optimism_count
    ratio = optimism_count / total if total > 0 else 0.5

    return {
        "distress_count": distress_count,
        "optimism_count": optimism_count,
        "total_posts": len(posts),
        "sentiment_ratio": round(ratio, 4),
    }


def main():
    print("=== Reddit Economic Sentiment Pipeline ===")

    print("\nNational subreddits:")
    national_posts = []
    for sub in NATIONAL_SUBS:
        print(f"  r/{sub}...", end=" ")
        posts = fetch_subreddit_posts(sub)
        print(f"{len(posts)} posts")
        national_posts.extend(posts)
        time.sleep(2)

    national_sentiment = compute_sentiment(national_posts)
    print(f"  National: {national_sentiment}")

    print("\nCity subreddits:")
    metro_data = {}
    for metro_id, subs in METRO_SUBS.items():
        metro = next((m for m in METROS if m.id == metro_id), None)
        if not metro:
            continue

        all_posts = []
        for sub in subs:
            print(f"  r/{sub} ({metro.name})...", end=" ")
            posts = fetch_subreddit_posts(sub)
            print(f"{len(posts)} posts")
            all_posts.extend(posts)
            time.sleep(2)

        sentiment = compute_sentiment(all_posts)
        metro_data[metro_id] = {
            "metro": metro.name,
            "state": metro.state,
            "subreddits": subs,
            "sentiment": sentiment,
            "fetched_at": datetime.now().isoformat(),
        }

    for metro in METROS:
        if metro.id not in metro_data:
            metro_data[metro.id] = {
                "metro": metro.name,
                "state": metro.state,
                "subreddits": [],
                "sentiment": national_sentiment,
                "note": "national fallback",
                "fetched_at": datetime.now().isoformat(),
            }

    output = {
        "national": national_sentiment,
        "metros": metro_data,
    }

    output_path = OUTPUT_DIR / "reddit_sentiment.json"
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nSaved to {output_path}")
    print(f"Metros with local data: {sum(1 for v in metro_data.values() if not v.get('note'))}/{len(METROS)}")


if __name__ == "__main__":
    main()
