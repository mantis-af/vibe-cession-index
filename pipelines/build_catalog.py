"""
Build a unified data catalog from all pipeline outputs.
Creates catalog.json: a searchable index of every available series
with metadata + actual time series data for charting.
"""

import json
from pathlib import Path
from datetime import datetime

OUTPUT_DIR = Path(__file__).parent / "output"
DATA_DIR = Path(__file__).parent.parent / "src" / "data"
CATALOG_JSON = DATA_DIR / "catalog.json"


def load(name: str) -> dict:
    p = OUTPUT_DIR / f"{name}.json"
    if p.exists():
        with open(p) as f:
            return json.load(f)
    return {}


def main():
    print("=== Building Data Catalog ===")
    series = []

    # --- National: FRED Macro ---
    macro = load("fred_macro")
    for key, spec in macro.items():
        pts = spec.get("points", [])
        if not pts:
            continue
        series.append({
            "id": f"macro_{key}",
            "name": spec["name"],
            "category": "Macro",
            "scope": "national",
            "unit": spec.get("unit", ""),
            "frequency": spec.get("frequency", "monthly"),
            "source": "FRED",
            "points": [{"date": p["date"], "value": p["value"]} for p in pts],
        })

    # --- National: FRED Expanded ---
    expanded = load("fred_expanded")
    for key, spec in expanded.get("national", {}).items():
        pts = spec.get("points", [])
        if not pts:
            continue
        series.append({
            "id": f"expanded_{key}",
            "name": spec["name"],
            "category": "Markets" if key in ("sp500", "vix", "yield_curve", "hy_spread", "mortgage_30y") else
                        "Housing" if key in ("housing_starts", "case_shiller") else
                        "Labor" if key in ("job_openings", "quit_rate", "continued_claims", "new_biz_apps") else
                        "Consumer" if key in ("savings_rate", "disposable_income", "vehicle_sales", "consumer_credit") else
                        "Other",
            "scope": "national",
            "unit": spec.get("unit", ""),
            "frequency": spec.get("frequency", "monthly"),
            "source": "FRED",
            "points": [{"date": p["date"], "value": p["value"]} for p in pts],
        })

    # --- Gas prices ---
    gas = load("eia_gas")
    for key, spec in gas.get("regions", {}).items():
        pts = spec.get("points", [])
        if not pts:
            continue
        series.append({
            "id": f"gas_{key}",
            "name": spec.get("name", key),
            "category": "Prices",
            "scope": "regional",
            "unit": "$/gal",
            "frequency": "weekly",
            "source": "EIA/FRED",
            "points": [{"date": p["week"], "value": p["price"]} for p in pts],
        })

    # --- National CPI ---
    cpi = load("bls_cpi_metro")
    nat_cpi = cpi.get("_national", {}).get("points", [])
    if nat_cpi:
        series.append({
            "id": "cpi_national",
            "name": "National CPI (All Items)",
            "category": "Prices",
            "scope": "national",
            "unit": "Index",
            "frequency": "monthly",
            "source": "BLS",
            "points": [{"date": p["month"], "value": p["cpi_index"]} for p in nat_cpi],
        })

    # --- Per-metro series ---
    dashboard = json.load(open(DATA_DIR / "dashboard.json"))
    metros_dir = DATA_DIR / "metros"

    for m_summary in dashboard["metros"]:
        mid = m_summary["id"]
        mname = m_summary["name"]
        mstate = m_summary["state"]
        label = f"{mname}, {mstate}"

        # Load full metro data
        metro_file = metros_dir / f"{mid}.json"
        if not metro_file.exists():
            continue
        with open(metro_file) as f:
            mdata = json.load(f)

        history = mdata.get("history", [])
        if not history:
            continue

        # Behavioral Index
        series.append({
            "id": f"metro_{mid}_index",
            "name": f"{label} — Behavioral Index",
            "category": "Index",
            "scope": "metro",
            "metro": mid,
            "metroName": label,
            "unit": "Score (0-100)",
            "frequency": "weekly",
            "source": "Undercurrent",
            "points": [{"date": h["week"], "value": h["compositeScore"]} for h in history],
        })

        # Official Index
        series.append({
            "id": f"metro_{mid}_official",
            "name": f"{label} — Official Index",
            "category": "Index",
            "scope": "metro",
            "metro": mid,
            "metroName": label,
            "unit": "Score (0-100)",
            "frequency": "weekly",
            "source": "Undercurrent",
            "points": [{"date": h["week"], "value": h["officialIndex"]} for h in history],
        })

        # Sentiment Gap
        series.append({
            "id": f"metro_{mid}_gap",
            "name": f"{label} — Sentiment Gap",
            "category": "Index",
            "scope": "metro",
            "metro": mid,
            "metroName": label,
            "unit": "Points",
            "frequency": "weekly",
            "source": "Undercurrent",
            "points": [{"date": h["week"], "value": h["vibesGap"]} for h in history],
        })

        # Individual signals
        signal_names = {
            "google_trends_anxiety": "Search Anxiety",
            "unemployment_rate": "Unemployment Rate",
            "initial_claims": "Initial Claims",
            "housing_inventory": "Housing Inventory",
            "housing_dom": "Days on Market",
            "housing_price_drops": "Price Drops",
            "new_biz_apps": "New Business Apps",
            "ai_job_ratio": "AI Job Search Ratio",
        }
        for sig_key, sig_name in signal_names.items():
            vals = [h["signals"].get(sig_key, 0) for h in history]
            if all(abs(v) < 0.001 for v in vals):
                continue
            series.append({
                "id": f"metro_{mid}_sig_{sig_key}",
                "name": f"{label} — {sig_name} (z-score)",
                "category": "Signals",
                "scope": "metro",
                "metro": mid,
                "metroName": label,
                "unit": "Z-score",
                "frequency": "weekly",
                "source": "Undercurrent",
                "points": [{"date": h["week"], "value": round(h["signals"].get(sig_key, 0), 3)} for h in history],
            })

        # CPI (if available)
        metro_cpi = cpi.get(mid, {}).get("points", [])
        if metro_cpi:
            series.append({
                "id": f"metro_{mid}_cpi",
                "name": f"{label} — CPI Index",
                "category": "Prices",
                "scope": "metro",
                "metro": mid,
                "metroName": label,
                "unit": "Index",
                "frequency": "monthly",
                "source": "BLS",
                "points": [{"date": p["month"], "value": p["cpi_index"]} for p in metro_cpi],
            })

        # Home values (Zillow)
        zillow = load("zillow_zhvi")
        z_metro = zillow.get(mid, {}).get("points", [])
        if z_metro:
            series.append({
                "id": f"metro_{mid}_zhvi",
                "name": f"{label} — Home Value (Zillow)",
                "category": "Housing",
                "scope": "metro",
                "metro": mid,
                "metroName": label,
                "unit": "$",
                "frequency": "monthly",
                "source": "Zillow",
                "points": [{"date": p["month"], "value": p["zhvi"]} for p in z_metro],
            })

    # Build catalog index (metadata only, no points — for search)
    catalog_index = []
    for s in series:
        catalog_index.append({
            "id": s["id"],
            "name": s["name"],
            "category": s["category"],
            "scope": s["scope"],
            "metro": s.get("metro"),
            "metroName": s.get("metroName"),
            "unit": s["unit"],
            "frequency": s["frequency"],
            "source": s["source"],
            "pointCount": len(s["points"]),
        })

    output = {
        "generatedAt": datetime.now().isoformat(),
        "totalSeries": len(series),
        "index": catalog_index,
        "series": {s["id"]: s["points"] for s in series},
    }

    with open(CATALOG_JSON, "w") as f:
        json.dump(output, f)

    size_mb = CATALOG_JSON.stat().st_size / 1024 / 1024
    print(f"Catalog: {len(series)} series, {size_mb:.1f} MB")
    print(f"Breakdown:")
    from collections import Counter
    cats = Counter(s["category"] for s in series)
    for cat, count in cats.most_common():
        print(f"  {cat}: {count}")
    scopes = Counter(s["scope"] for s in series)
    for scope, count in scopes.most_common():
        print(f"  {scope}: {count}")


if __name__ == "__main__":
    main()
