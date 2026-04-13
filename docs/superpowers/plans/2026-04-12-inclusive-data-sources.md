# Inclusive Data Sources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 15 new data sources to Undercurrent that represent renters, low-income households, gig workers, and communities underserved by current homeowner/investor-focused signals.

**Architecture:** Each new source is a standalone Python script in `pipelines/sources/` following the existing pattern: import METROS from config, fetch data, write JSON to OUTPUT_DIR. Three existing files get modifications (config.py, fred_expanded.py, google_trends.py). Finally, run_all.py and compute_index.py are updated to integrate everything.

**Tech Stack:** Python 3, pandas, requests, pytrends (existing deps). No new dependencies needed.

---

## File Map

**New files (13 source collectors):**
- `pipelines/sources/zillow_rents.py` — Zillow ZORI rent index
- `pipelines/sources/usda_snap.py` — SNAP/food stamp enrollment
- `pipelines/sources/bls_qcew.py` — Quarterly wages by metro
- `pipelines/sources/census_pulse.py` — Household Pulse Survey hardship
- `pipelines/sources/opportunity_insights.py` — Spending by income quartile
- `pipelines/sources/hud_fmr.py` — HUD Fair Market Rents
- `pipelines/sources/reddit_sentiment.py` — Subreddit economic sentiment
- `pipelines/sources/dot_transit.py` — Transit ridership by metro
- `pipelines/sources/apartment_list.py` — Apartment List rent estimates
- `pipelines/sources/yelp_local.py` — Local business openings/closings
- `pipelines/sources/google_trends_survival.py` — Survival-mode search terms
- `pipelines/sources/google_trends_migration.py` — Migration intent search terms
- `pipelines/sources/fed_survey.py` — Fed financial fragility data

**Modified files:**
- `pipelines/sources/fred_expanded.py` — Add delinquency series to NATIONAL_SERIES
- `pipelines/config.py` — Add SURVIVAL_TERMS, MIGRATION_TERMS, CBSA codes for new metros
- `pipelines/run_all.py` — Register all new source scripts
- `pipelines/compute_index.py` — Add new signals to SIGNAL_WEIGHTS
- `pipelines/taxonomy.py` — Add rental, safety-net, transit categories

---

## Task 1: FRED Delinquency Series (modify existing)

**Files:**
- Modify: `pipelines/sources/fred_expanded.py:22-45` (NATIONAL_SERIES dict)

- [ ] **Step 1: Add delinquency series to NATIONAL_SERIES**

In `pipelines/sources/fred_expanded.py`, add these entries to the `NATIONAL_SERIES` dict after the existing `"m2_money"` entry:

```python
    # Delinquency / Financial Stress
    "delinq_credit_card": {"id": "DRCCLACBS", "name": "Credit Card Delinquency Rate", "unit": "%", "freq": "quarterly"},
    "delinq_mortgage": {"id": "DRSFRMACBS", "name": "Mortgage Delinquency Rate", "unit": "%", "freq": "quarterly"},
    "delinq_auto": {"id": "DRALACBS", "name": "Auto Loan Delinquency Rate", "unit": "%", "freq": "quarterly"},
    "delinq_business": {"id": "DRBLACBS", "name": "Business Loan Delinquency Rate", "unit": "%", "freq": "quarterly"},
    "chargeoff_credit_card": {"id": "CORCCACBS", "name": "Credit Card Charge-Off Rate", "unit": "%", "freq": "quarterly"},
```

- [ ] **Step 2: Run fred_expanded to verify new series fetch**

Run: `cd /Users/alexanderfinan/vibe-cession-index && pipelines/.venv/bin/python pipelines/sources/fred_expanded.py`
Expected: New delinquency series appear in output with data points (quarterly = fewer points, ~8-10 per series)

- [ ] **Step 3: Verify output JSON contains delinquency data**

Run: `cd /Users/alexanderfinan/vibe-cession-index && pipelines/.venv/bin/python -c "import json; d=json.load(open('pipelines/output/fred_expanded.json')); print([k for k in d['national'] if 'delinq' in k or 'chargeoff' in k])"`
Expected: `['delinq_credit_card', 'delinq_mortgage', 'delinq_auto', 'delinq_business', 'chargeoff_credit_card']`

- [ ] **Step 4: Commit**

```bash
git add pipelines/sources/fred_expanded.py
git commit -m "feat: add delinquency and charge-off series to FRED expanded pipeline"
```

---

## Task 2: Zillow ZORI Rent Index

**Files:**
- Create: `pipelines/sources/zillow_rents.py`

- [ ] **Step 1: Create zillow_rents.py**

```python
"""
Zillow Observed Rent Index (ZORI) pipeline — metro-level rent prices.

Source: Zillow Research public CSV — monthly smoothed rent index by metro.
Covers ~50 metros, giving us rent levels and YoY changes for the renter population.
"""

import json
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

ZORI_URL = "https://files.zillowstatic.com/research/public_csvs/zori/Metro_zori_uc_sfrcondomfr_sm_sa_month.csv"

# Auto-generate from config: "City, ST"
ZILLOW_METRO_MAP = {m.id: f"{m.name}, {m.state}" for m in METROS}
ZILLOW_METRO_MAP["dca"] = "Washington, DC"


def main():
    print("=== Zillow Observed Rent Index (ZORI) Pipeline ===")
    print("Downloading ZORI data...")
    try:
        df = pd.read_csv(ZORI_URL)
    except Exception as e:
        print(f"  Failed to download ZORI: {e}")
        # Write empty output so pipeline doesn't break
        with open(OUTPUT_DIR / "zillow_zori.json", "w") as f:
            json.dump({}, f)
        return

    print(f"  Loaded {len(df)} metros, {df.shape[1]} columns")

    # Date columns are everything after the metadata columns
    meta_cols = ["RegionID", "SizeRank", "RegionName", "RegionType", "StateName"]
    date_cols = [c for c in df.columns if c not in meta_cols]
    # Keep only last 24 months
    recent_dates = sorted(date_cols)[-24:]

    all_data = {}
    for metro in METROS:
        zillow_name = ZILLOW_METRO_MAP.get(metro.id)
        if not zillow_name:
            continue

        row = df[df["RegionName"] == zillow_name]
        if row.empty:
            # Try partial match
            row = df[df["RegionName"].str.contains(metro.name, case=False, na=False)]
        if row.empty:
            print(f"  {metro.name}: not found as '{zillow_name}'")
            continue

        row = row.iloc[0]
        points = []
        for date_col in recent_dates:
            val = row.get(date_col)
            if pd.notna(val):
                points.append({
                    "month": date_col[:7],  # YYYY-MM
                    "rent": round(float(val), 0),
                })

        # Compute YoY rent change
        for i in range(12, len(points)):
            current = points[i]["rent"]
            year_ago = points[i - 12]["rent"]
            if year_ago > 0:
                points[i]["yoy_pct"] = round((current - year_ago) / year_ago * 100, 2)

        all_data[metro.id] = {
            "metro": metro.name,
            "state": metro.state,
            "points": points,
        }
        latest = points[-1] if points else {}
        yoy = latest.get("yoy_pct", "N/A")
        print(f"  {metro.name}: {len(points)} months, latest ${latest.get('rent', 0):,.0f}/mo, YoY {yoy}%")

    output_path = OUTPUT_DIR / "zillow_zori.json"
    with open(output_path, "w") as f:
        json.dump(all_data, f, indent=2)
    print(f"\nSaved to {output_path}")
    print(f"Metros: {sum(1 for v in all_data.values() if v['points'])}/{len(METROS)}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run and verify**

Run: `cd /Users/alexanderfinan/vibe-cession-index && pipelines/.venv/bin/python pipelines/sources/zillow_rents.py`
Expected: Output showing metro names with rent data, saved to `pipelines/output/zillow_zori.json`

- [ ] **Step 3: Commit**

```bash
git add pipelines/sources/zillow_rents.py
git commit -m "feat: add Zillow ZORI rent index pipeline for renter population coverage"
```

---

## Task 3: USDA SNAP Enrollment

**Files:**
- Create: `pipelines/sources/usda_snap.py`

- [ ] **Step 1: Create usda_snap.py**

```python
"""
USDA SNAP (food stamp) enrollment pipeline — state-level participation data.

Source: USDA FNS publishes monthly SNAP participation by state.
https://www.fns.usda.gov/pd/supplemental-nutrition-assistance-program-snap

This is a direct measure of food insecurity — rises before official recessions.
State-level data is mapped to metros via config.py state codes.
"""

import json
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

# FRED carries SNAP participation by state: SNAP_{state FIPS}
# Format: "BRXX" where XX is the state abbreviation
_STATES = sorted(set(m.state for m in METROS))

# FRED series for SNAP persons by state
STATE_SNAP_SERIES = {st: f"BR{st}SNAP" for st in _STATES}

# Fallback: national SNAP
NATIONAL_SNAP = "SNAP"


def fetch_fred_csv(series_id: str, start_date: str) -> list[dict]:
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}&cosd={start_date}"
    try:
        df = pd.read_csv(url)
        if df.empty:
            return []
        df.columns = ["date", "value"]
        df["value"] = pd.to_numeric(df["value"], errors="coerce")
        df = df.dropna(subset=["value"])
        return [{"date": str(row["date"]), "value": round(float(row["value"]), 0)} for _, row in df.iterrows()]
    except Exception:
        return []


def main():
    print("=== USDA SNAP Enrollment Pipeline ===")
    start_date = (datetime.now() - timedelta(days=730)).strftime("%Y-%m-%d")

    # National SNAP
    print("  National SNAP participation...")
    national_points = fetch_fred_csv(NATIONAL_SNAP, start_date)
    print(f"    {len(national_points)} points")

    # State-level SNAP via FRED
    state_snap = {}
    print("\nState SNAP participation:")
    for state in _STATES:
        # FRED state SNAP series: BRXXSNAP didn't work, try alternate patterns
        # Try: {STATE}SNAP, SNAP{STATE}
        series_ids = [
            f"BR{state}SNAP",
            f"SNAP{state}",
            f"{state}SNAP",
        ]
        points = []
        for sid in series_ids:
            points = fetch_fred_csv(sid, start_date)
            if points:
                print(f"  {state}: {len(points)} points (via {sid})")
                break
        if not points:
            print(f"  {state}: no data found")
        state_snap[state] = {"points": points}
        time.sleep(0.3)

    # Map to metros
    metro_snap = {}
    for metro in METROS:
        st = metro.state
        metro_snap[metro.id] = {
            "metro": metro.name,
            "state": metro.state,
            "points": state_snap.get(st, {}).get("points", []),
        }

    output = {
        "national": {"points": national_points},
        "states": state_snap,
        "metros": metro_snap,
    }

    output_path = OUTPUT_DIR / "usda_snap.json"
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nSaved to {output_path}")
    print(f"States with data: {sum(1 for v in state_snap.values() if v['points'])}/{len(_STATES)}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run and verify**

Run: `cd /Users/alexanderfinan/vibe-cession-index && pipelines/.venv/bin/python pipelines/sources/usda_snap.py`
Expected: Some states may not have FRED series — that's OK, the pipeline gracefully handles missing data.

- [ ] **Step 3: Commit**

```bash
git add pipelines/sources/usda_snap.py
git commit -m "feat: add USDA SNAP enrollment pipeline — food insecurity signal"
```

---

## Task 4: BLS Quarterly Census of Employment & Wages (QCEW)

**Files:**
- Create: `pipelines/sources/bls_qcew.py`

- [ ] **Step 1: Create bls_qcew.py**

```python
"""
BLS Quarterly Census of Employment & Wages (QCEW) pipeline.

Source: BLS QCEW API — average weekly wages by metro (CBSA).
https://data.bls.gov/cew/data/api/

Tells us whether workers in each metro are actually earning more or less —
income growth vs inflation is the real "are people getting ahead" signal.
"""

import json
import sys
import time
from datetime import datetime
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

# QCEW API endpoint
QCEW_API = "https://data.bls.gov/cew/data/api"

# CBSA FIPS codes for our metros (reusing from census_permits + extending)
CBSA_MAP = {
    "nyc": "35620", "lax": "31080", "chi": "16980", "hou": "26420",
    "phx": "38060", "phl": "37980", "sat": "41700", "sdg": "41740",
    "dal": "19100", "sjc": "41940", "aus": "12420", "jax": "27260",
    "sfo": "41860", "cmh": "18140", "clt": "16740", "ind": "26900",
    "sea": "42660", "den": "19740", "dca": "47900", "bna": "34980",
    "ftw": "19100", "okc": "36420", "elp": "21340", "las": "29820",
    "pdx": "38900", "mem": "32820", "lou": "31140", "bal": "12580",
    "mil": "33340", "abq": "10740", "tuc": "46060", "msa": "38060",
    "atl": "12060", "kcm": "28140", "ral": "39580", "mia": "33100",
    "tpa": "45300", "stl": "41180", "pit": "38300", "cin": "17140",
    "orl": "36740", "cle": "17460", "min": "33460", "det": "19820",
    "slc": "41620", "bos": "14460", "ric": "40060", "bir": "13820",
    "har": "25540", "buf": "15380",
}


def fetch_qcew_area(area_fips: str, year: int, qtr: str) -> dict | None:
    """Fetch QCEW data for an area, year, quarter. Returns wage data or None."""
    # QCEW CSV API: /YEAR/QTR/area/FIPS.csv
    url = f"{QCEW_API}/{year}/{qtr}/area/{area_fips}.csv"
    try:
        resp = requests.get(url, timeout=15)
        if resp.status_code != 200:
            return None
        # Parse CSV lines — header + data rows
        lines = resp.text.strip().split("\n")
        if len(lines) < 2:
            return None
        import csv
        import io
        reader = csv.DictReader(io.StringIO(resp.text))
        # Filter to total private (own_code=5) and all industries (industry_code=10)
        for row in reader:
            if row.get("own_code") == "5" and row.get("industry_code") == "10":
                avg_wkly = row.get("avg_wkly_wage", "")
                total_emp = row.get("month3_emplvl", "")
                if avg_wkly and avg_wkly != "0":
                    return {
                        "avg_weekly_wage": int(avg_wkly),
                        "employment": int(total_emp) if total_emp else None,
                    }
    except Exception:
        pass
    return None


def main():
    print("=== BLS QCEW Pipeline — Metro Average Weekly Wages ===")
    now = datetime.now()
    # QCEW data lags ~6 months, so fetch last 2 full years
    years = [now.year - 2, now.year - 1, now.year]
    quarters = ["1", "2", "3", "4"]

    all_data = {}
    for i, metro in enumerate(METROS):
        cbsa = CBSA_MAP.get(metro.id)
        if not cbsa:
            print(f"  [{i+1}/{len(METROS)}] {metro.name}: no CBSA code, skipping")
            continue

        # QCEW uses "CXXXX" format for CBSA areas
        area_fips = f"C{cbsa}"
        print(f"  [{i+1}/{len(METROS)}] {metro.name} (CBSA {cbsa})...", end=" ")

        points = []
        for year in years:
            for qtr in quarters:
                # Skip future quarters
                if year == now.year and int(qtr) > (now.month - 1) // 3 + 1:
                    break
                result = fetch_qcew_area(area_fips, year, qtr)
                if result:
                    points.append({
                        "quarter": f"{year}-Q{qtr}",
                        "avg_weekly_wage": result["avg_weekly_wage"],
                        "employment": result["employment"],
                    })
                time.sleep(0.3)

        # Compute YoY wage growth
        for idx in range(4, len(points)):
            current = points[idx]["avg_weekly_wage"]
            year_ago = points[idx - 4]["avg_weekly_wage"]
            if year_ago > 0:
                points[idx]["wage_growth_yoy"] = round((current - year_ago) / year_ago * 100, 2)

        all_data[metro.id] = {
            "metro": metro.name,
            "state": metro.state,
            "points": points,
        }
        print(f"{len(points)} quarters")

    output_path = OUTPUT_DIR / "bls_qcew.json"
    with open(output_path, "w") as f:
        json.dump(all_data, f, indent=2)
    print(f"\nSaved to {output_path}")
    print(f"Metros with data: {sum(1 for v in all_data.values() if v['points'])}/{len(METROS)}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run and verify**

Run: `cd /Users/alexanderfinan/vibe-cession-index && pipelines/.venv/bin/python pipelines/sources/bls_qcew.py`
Expected: QCEW data lags ~6 months so recent quarters may be empty. Should get at least a few quarters per metro.

- [ ] **Step 3: Commit**

```bash
git add pipelines/sources/bls_qcew.py
git commit -m "feat: add BLS QCEW metro wage pipeline — real income growth signal"
```

---

## Task 5: Census Household Pulse Survey

**Files:**
- Create: `pipelines/sources/census_pulse.py`

- [ ] **Step 1: Create census_pulse.py**

```python
"""
Census Household Pulse Survey pipeline — direct hardship measures.

Source: Census Bureau experimental data product.
https://www.census.gov/data/experimental-data-products/household-pulse-survey.html

The Pulse Survey directly asks people: "Are you having difficulty paying bills?"
"Did you not have enough to eat?" "Do you feel anxious/depressed?"
This is the closest thing to a direct vibes measurement from actual people.

Published as biweekly tables by state (metro-level available for largest MSAs).
"""

import json
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd
import requests

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

# Census Pulse Survey data tables URL pattern
# The Pulse publishes data tables as Excel files per wave
PULSE_BASE = "https://www2.census.gov/programs-surveys/demo/tables/hhp"

# State FIPS codes for our states
STATE_FIPS = {
    "AL": "01", "AZ": "04", "CA": "06", "CO": "08", "CT": "09",
    "DC": "11", "FL": "12", "GA": "13", "IL": "17", "IN": "18",
    "KY": "21", "MA": "25", "MD": "24", "MI": "26", "MN": "27",
    "MO": "29", "NC": "37", "NM": "35", "NV": "32", "NY": "36",
    "OH": "39", "OK": "40", "OR": "41", "PA": "42", "TN": "47",
    "TX": "48", "UT": "49", "VA": "51", "WA": "53", "WI": "55",
}


def fetch_pulse_spending_table() -> pd.DataFrame | None:
    """Fetch the latest Pulse Survey spending/hardship data.
    
    Falls back to the public use microdata summary tables on data.census.gov.
    """
    # Try the Census API for Pulse data
    # The Pulse Survey publishes a "difficulty paying expenses" table
    api_url = "https://api.census.gov/data/timeseries/hhp"
    try:
        # Get the latest available week
        resp = requests.get(f"{api_url}?get=SPENDING1,SPENDING2,SPENDING3&for=state:*&SCRAM=1&WEEK=70", timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            if len(data) > 1:
                headers = data[0]
                rows = data[1:]
                return pd.DataFrame(rows, columns=headers)
    except Exception:
        pass
    return None


def main():
    print("=== Census Household Pulse Survey Pipeline ===")
    
    # The Pulse Survey data is complex — try multiple access methods
    # Method 1: Census API
    print("  Trying Census Pulse API...")
    
    # Fetch hardship indicators by state for recent weeks
    api_url = "https://api.census.gov/data/timeseries/hhp"
    
    state_data = {}
    _states = sorted(set(m.state for m in METROS))
    
    # Try fetching recent weeks (Pulse runs biweekly, ~70+ waves as of 2026)
    for week_num in range(65, 75):
        try:
            params = {
                "get": "TBIRTH_YEAR,THHLD_NUMPER,SPENDING1",
                "for": "state:*",
                "WEEK": str(week_num),
            }
            resp = requests.get(api_url, params=params, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                if len(data) > 1:
                    print(f"    Week {week_num}: {len(data)-1} state records")
                    for row in data[1:]:
                        # Parse state FIPS -> state abbreviation
                        state_fips = row[-1] if len(row) > 0 else None
                        if state_fips:
                            # Reverse lookup state FIPS
                            for st, fips in STATE_FIPS.items():
                                if fips == state_fips:
                                    if st not in state_data:
                                        state_data[st] = []
                                    state_data[st].append({
                                        "week": week_num,
                                        "raw": row,
                                    })
            time.sleep(0.3)
        except Exception as e:
            print(f"    Week {week_num}: {e}")
    
    # If API approach didn't work, try downloading summary tables
    if not state_data:
        print("  API returned no usable data. Trying summary CSV...")
        # Fall back to FRED series for economic hardship proxies
        # FRED has "difficulty paying expenses" from Pulse as experimental series
        difficulty_series = {
            # These FRED series come from Pulse Survey data
            "pulse_difficulty_national": "CDCPDE",
        }
        
        for key, sid in difficulty_series.items():
            start = (datetime.now() - timedelta(days=730)).strftime("%Y-%m-%d")
            url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={sid}&cosd={start}"
            try:
                df = pd.read_csv(url)
                if not df.empty:
                    df.columns = ["date", "value"]
                    df["value"] = pd.to_numeric(df["value"], errors="coerce")
                    df = df.dropna()
                    print(f"    {key}: {len(df)} points via FRED")
                    state_data["_national"] = [
                        {"date": str(row["date"]), "value": float(row["value"])}
                        for _, row in df.iterrows()
                    ]
            except Exception:
                pass

    # Map to metros (state-level for now)
    metro_pulse = {}
    for metro in METROS:
        st = metro.state
        metro_pulse[metro.id] = {
            "metro": metro.name,
            "state": metro.state,
            "points": state_data.get(st, state_data.get("_national", [])),
            "note": "state-level data mapped to metro" if st in state_data else "national fallback",
        }

    output_path = OUTPUT_DIR / "census_pulse.json"
    with open(output_path, "w") as f:
        json.dump(metro_pulse, f, indent=2)
    print(f"\nSaved to {output_path}")
    print(f"States with data: {sum(1 for k, v in state_data.items() if k != '_national')}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run and verify**

Run: `cd /Users/alexanderfinan/vibe-cession-index && pipelines/.venv/bin/python pipelines/sources/census_pulse.py`
Expected: Census Pulse API is experimental — may return partial data or require fallback to FRED series. Either path produces output.

- [ ] **Step 3: Commit**

```bash
git add pipelines/sources/census_pulse.py
git commit -m "feat: add Census Household Pulse Survey — direct hardship measurement"
```

---

## Task 6: Opportunity Insights Economic Tracker

**Files:**
- Create: `pipelines/sources/opportunity_insights.py`

- [ ] **Step 1: Create opportunity_insights.py**

```python
"""
Opportunity Insights Economic Tracker pipeline.

Source: https://tracktherecovery.org / https://github.com/OpportunityInsights/EconomicTracker
Harvard/Brown research team (Raj Chetty et al.) — gold standard for
who is feeling the economy differently. Tracks spending, employment,
and revenue by income quartile and metro.

Published as public CSV, updated weekly.
"""

import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

# GitHub raw CSV URLs for Economic Tracker data
OI_BASE = "https://raw.githubusercontent.com/OpportunityInsights/EconomicTracker/main/data"

# Key datasets:
# - Affinity (spending by income quartile, metro level)
# - Employment (by income quartile, metro level)
# - Small business (revenue and openings, metro level)
DATASETS = {
    "spending": {
        "url": f"{OI_BASE}/Affinity - Metro - Daily.csv",
        "date_col": "date",
        "geo_col": "metro",
        "value_cols": ["spend_all", "spend_q1", "spend_q2", "spend_q3", "spend_q4"],
        "description": "Consumer spending indexed to Jan 2020, by income quartile",
    },
    "employment": {
        "url": f"{OI_BASE}/Employment - Metro - Daily.csv",
        "date_col": "date",
        "geo_col": "metro",
        "value_cols": ["emp", "emp_incq1", "emp_incq2", "emp_incq3", "emp_incq4"],
        "description": "Employment levels indexed to Jan 2020, by income quartile",
    },
    "small_biz_revenue": {
        "url": f"{OI_BASE}/Womply - Metro - Daily.csv",
        "date_col": "date",
        "geo_col": "metro",
        "value_cols": ["revenue_all", "merchants_all"],
        "description": "Small business revenue and active merchants",
    },
}

# Map our metro IDs to OI CBSA codes (they use numeric CBSA FIPS)
OI_CBSA_MAP = {
    "nyc": 35620, "lax": 31080, "chi": 16980, "hou": 26420,
    "phx": 38060, "phl": 37980, "sat": 41700, "sdg": 41740,
    "dal": 19100, "sjc": 41940, "aus": 12420, "jax": 27260,
    "sfo": 41860, "cmh": 18140, "clt": 16740, "ind": 26900,
    "sea": 42660, "den": 19740, "dca": 47900, "bna": 34980,
    "ftw": 19100, "okc": 36420, "las": 29820, "pdx": 38900,
    "mem": 32820, "lou": 31140, "bal": 12580, "mil": 33340,
    "atl": 12060, "kcm": 28140, "ral": 39580, "mia": 33100,
    "tpa": 45300, "stl": 41180, "pit": 38300, "cin": 17140,
    "orl": 36740, "cle": 17460, "min": 33460, "det": 19820,
    "slc": 41620, "bos": 14460, "ric": 40060, "bir": 13820,
    "buf": 15380,
}


def fetch_and_process(dataset_key: str, spec: dict) -> dict:
    """Fetch a dataset and process into per-metro weekly data."""
    print(f"  Downloading {dataset_key}...")
    try:
        df = pd.read_csv(spec["url"])
    except Exception as e:
        print(f"    Failed: {e}")
        return {}

    print(f"    Loaded {len(df)} rows, columns: {list(df.columns)[:8]}...")

    # Filter to last 400 days
    cutoff = (datetime.now() - timedelta(days=400)).strftime("%Y-%m-%d")
    if spec["date_col"] in df.columns:
        df[spec["date_col"]] = pd.to_datetime(df[spec["date_col"]], errors="coerce")
        df = df[df[spec["date_col"]] >= cutoff]

    # Identify geo column — OI uses numeric CBSA codes
    geo_col = spec["geo_col"]
    if geo_col not in df.columns:
        # Try alternate column names
        for alt in ["countyfips", "cbsa", "statefips", "metro_fips"]:
            if alt in df.columns:
                geo_col = alt
                break

    result = {}
    for metro_id, cbsa in OI_CBSA_MAP.items():
        metro_df = df[df[geo_col] == cbsa] if geo_col in df.columns else pd.DataFrame()
        if metro_df.empty:
            continue

        # Resample daily to weekly
        metro_df = metro_df.set_index(spec["date_col"])
        available_cols = [c for c in spec["value_cols"] if c in metro_df.columns]
        if not available_cols:
            continue

        weekly = metro_df[available_cols].resample("W-MON").mean().dropna(how="all")
        points = []
        for date, row in weekly.iterrows():
            point = {"week": date.strftime("%Y-%m-%d")}
            for col in available_cols:
                val = row[col]
                if pd.notna(val):
                    point[col] = round(float(val), 4)
            if len(point) > 1:  # has at least one value besides week
                points.append(point)

        if points:
            result[metro_id] = points

    print(f"    Metros with data: {len(result)}")
    return result


def main():
    print("=== Opportunity Insights Economic Tracker ===")

    all_data = {}
    for key, spec in DATASETS.items():
        data = fetch_and_process(key, spec)
        all_data[key] = data

    # Merge into per-metro structure
    metro_data = {}
    for metro in METROS:
        mid = metro.id
        metro_entry = {
            "metro": metro.name,
            "state": metro.state,
            "spending": all_data.get("spending", {}).get(mid, []),
            "employment": all_data.get("employment", {}).get(mid, []),
            "small_biz": all_data.get("small_biz_revenue", {}).get(mid, []),
        }
        metro_data[mid] = metro_entry

    output_path = OUTPUT_DIR / "opportunity_insights.json"
    with open(output_path, "w") as f:
        json.dump(metro_data, f, indent=2)
    print(f"\nSaved to {output_path}")
    has_any = sum(1 for v in metro_data.values()
                  if v["spending"] or v["employment"] or v["small_biz"])
    print(f"Metros with any data: {has_any}/{len(METROS)}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run and verify**

Run: `cd /Users/alexanderfinan/vibe-cession-index && pipelines/.venv/bin/python pipelines/sources/opportunity_insights.py`
Expected: Opportunity Insights may have changed CSV structure — the pipeline handles missing columns gracefully.

- [ ] **Step 3: Commit**

```bash
git add pipelines/sources/opportunity_insights.py
git commit -m "feat: add Opportunity Insights tracker — spending/employment by income quartile"
```

---

## Task 7: HUD Fair Market Rents

**Files:**
- Create: `pipelines/sources/hud_fmr.py`

- [ ] **Step 1: Create hud_fmr.py**

```python
"""
HUD Fair Market Rents pipeline — official rent benchmarks by metro.

Source: HUD User API — https://www.huduser.gov/portal/dataset/fmr-api.html
FMRs set the standard for "affordable" rent per HUD definition.
Annual data by metro and bedroom count.

No API key required for basic access.
"""

import json
import sys
import time
from datetime import datetime
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

# HUD uses CBSA codes — same as Census
CBSA_MAP = {
    "nyc": "35620", "lax": "31080", "chi": "16980", "hou": "26420",
    "phx": "38060", "phl": "37980", "sat": "41700", "sdg": "41740",
    "dal": "19100", "sjc": "41940", "aus": "12420", "jax": "27260",
    "sfo": "41860", "cmh": "18140", "clt": "16740", "ind": "26900",
    "sea": "42660", "den": "19740", "dca": "47900", "bna": "34980",
    "ftw": "19100", "okc": "36420", "elp": "21340", "las": "29820",
    "pdx": "38900", "mem": "32820", "lou": "31140", "bal": "12580",
    "mil": "33340", "abq": "10740", "tuc": "46060", "msa": "38060",
    "atl": "12060", "kcm": "28140", "ral": "39580", "mia": "33100",
    "tpa": "45300", "stl": "41180", "pit": "38300", "cin": "17140",
    "orl": "36740", "cle": "17460", "min": "33460", "det": "19820",
    "slc": "41620", "bos": "14460", "ric": "40060", "bir": "13820",
    "har": "25540", "buf": "15380",
}

HUD_API = "https://www.huduser.gov/hudapi/public/fmr/data"


def fetch_fmr(cbsa: str, year: int) -> dict | None:
    """Fetch Fair Market Rents for a CBSA and fiscal year."""
    # HUD API: /fmr/data/{entityid}?year={year}
    # entityid for MSA = "METRO{cbsa}M{cbsa}"
    entity_id = f"METRO{cbsa}M{cbsa}"
    url = f"{HUD_API}/{entity_id}"
    params = {"year": year}
    try:
        resp = requests.get(url, params=params, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            if "data" in data and "basicdata" in data["data"]:
                bd = data["data"]["basicdata"]
                return {
                    "efficiency": bd.get("Efficiency", bd.get("efficiency")),
                    "one_bedroom": bd.get("One-Bedroom", bd.get("one_bedroom")),
                    "two_bedroom": bd.get("Two-Bedroom", bd.get("two_bedroom")),
                    "three_bedroom": bd.get("Three-Bedroom", bd.get("three_bedroom")),
                    "four_bedroom": bd.get("Four-Bedroom", bd.get("four_bedroom")),
                }
    except Exception:
        pass
    
    # Fallback: try simpler endpoint
    try:
        url2 = f"https://www.huduser.gov/hudapi/public/fmr/statedata/{cbsa}"
        resp = requests.get(url2, params={"year": year}, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            if "data" in data:
                return data["data"]
    except Exception:
        pass
    
    return None


def main():
    print("=== HUD Fair Market Rents Pipeline ===")
    current_year = datetime.now().year
    years = [current_year - 1, current_year]

    all_data = {}
    for i, metro in enumerate(METROS):
        cbsa = CBSA_MAP.get(metro.id)
        if not cbsa:
            print(f"  [{i+1}/{len(METROS)}] {metro.name}: no CBSA, skipping")
            continue

        print(f"  [{i+1}/{len(METROS)}] {metro.name}...", end=" ")
        points = []
        for year in years:
            result = fetch_fmr(cbsa, year)
            if result:
                result["year"] = year
                points.append(result)
            time.sleep(0.3)

        all_data[metro.id] = {
            "metro": metro.name,
            "state": metro.state,
            "points": points,
        }
        status = f"{len(points)} years" if points else "no data"
        two_br = points[-1].get("two_bedroom", "N/A") if points else "N/A"
        print(f"{status}, 2BR FMR: ${two_br}")

    output_path = OUTPUT_DIR / "hud_fmr.json"
    with open(output_path, "w") as f:
        json.dump(all_data, f, indent=2)
    print(f"\nSaved to {output_path}")
    print(f"Metros with data: {sum(1 for v in all_data.values() if v['points'])}/{len(METROS)}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run and verify**

Run: `cd /Users/alexanderfinan/vibe-cession-index && pipelines/.venv/bin/python pipelines/sources/hud_fmr.py`
Expected: HUD API may require different entity ID format — the pipeline tries two endpoint patterns.

- [ ] **Step 3: Commit**

```bash
git add pipelines/sources/hud_fmr.py
git commit -m "feat: add HUD Fair Market Rents — official affordable rent benchmarks"
```

---

## Task 8: Reddit Economic Sentiment

**Files:**
- Create: `pipelines/sources/reddit_sentiment.py`

- [ ] **Step 1: Create reddit_sentiment.py**

```python
"""
Reddit economic sentiment pipeline — subreddit-level economic mood.

Source: Reddit JSON API (no auth needed for public subreddits).
Analyzes post titles from economy-related subreddits for sentiment keywords.

Google Trends shows what people search; Reddit shows how they talk and feel.
More authentic than search intent — people describe their actual situations.
"""

import json
import re
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

# National subreddits for economic sentiment
NATIONAL_SUBS = [
    "personalfinance",
    "economy",
    "povertyfinance",
    "antiwork",
    "financialindependence",
    "jobs",
]

# City subreddits for metro-level sentiment
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

# Simple keyword-based sentiment (avoids needing NLP dependencies)
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
    """Fetch recent posts from a subreddit via JSON API."""
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
    """Score posts for distress vs optimism keywords."""
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
    # sentiment_ratio: 0 = all distress, 1 = all optimism, 0.5 = balanced
    ratio = optimism_count / total if total > 0 else 0.5

    return {
        "distress_count": distress_count,
        "optimism_count": optimism_count,
        "total_posts": len(posts),
        "sentiment_ratio": round(ratio, 4),
    }


def main():
    print("=== Reddit Economic Sentiment Pipeline ===")

    # National sentiment
    print("\nNational subreddits:")
    national_posts = []
    for sub in NATIONAL_SUBS:
        print(f"  r/{sub}...", end=" ")
        posts = fetch_subreddit_posts(sub)
        print(f"{len(posts)} posts")
        national_posts.extend(posts)
        time.sleep(2)  # Reddit rate limit

    national_sentiment = compute_sentiment(national_posts)
    print(f"  National: {national_sentiment}")

    # Metro sentiment from city subreddits
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

    # For metros without subreddit data, use national as fallback
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
```

- [ ] **Step 2: Run and verify**

Run: `cd /Users/alexanderfinan/vibe-cession-index && pipelines/.venv/bin/python pipelines/sources/reddit_sentiment.py`
Expected: Reddit JSON API works without auth for public subreddits. Rate limit is generous (2s between requests). Should get 50-100 posts per sub.

- [ ] **Step 3: Commit**

```bash
git add pipelines/sources/reddit_sentiment.py
git commit -m "feat: add Reddit economic sentiment pipeline — authentic community mood"
```

---

## Task 9: DOT Transit Ridership

**Files:**
- Create: `pipelines/sources/dot_transit.py`

- [ ] **Step 1: Create dot_transit.py**

```python
"""
DOT National Transit Database pipeline — transit ridership by metro.

Source: FTA National Transit Database
https://www.transit.dot.gov/ntd/ntd-data

Transit ridership is a proxy for commuter economic activity and a signal
for the car-free population (lower income, urban). Declining ridership
can signal economic distress or remote work shifts.

Uses the monthly ridership data published as CSV.
"""

import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

# NTD monthly ridership data (updated monthly)
# The NTD publishes a "Monthly Module Adjusted Data Release" as Excel/CSV
NTD_URL = "https://www.transit.dot.gov/sites/fta.dot.gov/files/2024-01/Monthly%20Module%20Adjusted%20Data%20Release.xlsx"

# Map our metros to NTD UZA (Urbanized Area) names
NTD_METRO_MAP = {
    "nyc": "New York",
    "lax": "Los Angeles",
    "chi": "Chicago",
    "hou": "Houston",
    "phx": "Phoenix",
    "phl": "Philadelphia",
    "sdg": "San Diego",
    "dal": "Dallas",
    "sfo": "San Francisco",
    "sea": "Seattle",
    "den": "Denver",
    "dca": "Washington",
    "bna": "Nashville",
    "pdx": "Portland",
    "atl": "Atlanta",
    "mia": "Miami",
    "tpa": "Tampa",
    "min": "Minneapolis",
    "det": "Detroit",
    "bos": "Boston",
    "bal": "Baltimore",
    "pit": "Pittsburgh",
    "cle": "Cleveland",
    "stl": "St. Louis",
    "slc": "Salt Lake",
    "las": "Las Vegas",
    "orl": "Orlando",
    "cin": "Cincinnati",
    "mil": "Milwaukee",
    "buf": "Buffalo",
}

# Fallback: use FRED transit ridership proxy
FRED_TRANSIT = "TRANSITD11"  # Public transit ridership index


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

    # Try downloading NTD data
    print("  Trying NTD monthly data download...")
    ntd_data = {}

    try:
        df = pd.read_excel(NTD_URL, sheet_name=0)
        print(f"    Loaded {len(df)} rows")
        print(f"    Columns: {list(df.columns)[:10]}...")

        # NTD data has Agency, UZA Name, Mode, and monthly ridership columns
        # Aggregate by UZA (metro area)
        uza_col = None
        for col in df.columns:
            if "uza" in str(col).lower() and "name" in str(col).lower():
                uza_col = col
                break

        if uza_col:
            # Find monthly columns (they're typically month/year format)
            month_cols = [c for c in df.columns if "/" in str(c) or "-" in str(c)]
            if not month_cols:
                # Try numeric year columns
                month_cols = [c for c in df.columns if str(c).replace(".", "").isdigit()]

            for metro_id, uza_name in NTD_METRO_MAP.items():
                metro_rows = df[df[uza_col].astype(str).str.contains(uza_name, case=False, na=False)]
                if metro_rows.empty:
                    continue
                # Sum all agencies/modes for this UZA
                points = []
                for mc in month_cols[-24:]:  # last 24 months
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

    # Fallback: FRED national transit index
    if not ntd_data:
        print("  Falling back to FRED transit data...")
        start = (datetime.now() - timedelta(days=730)).strftime("%Y-%m-%d")
        national = fetch_fred_csv(FRED_TRANSIT, start)
        if national:
            print(f"    National transit index: {len(national)} points")
            ntd_data["_national"] = national

    # Map to metros
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
```

- [ ] **Step 2: Run and verify**

Run: `cd /Users/alexanderfinan/vibe-cession-index && pipelines/.venv/bin/python pipelines/sources/dot_transit.py`
Expected: NTD Excel file URL changes yearly — may need URL update. FRED fallback ensures output is always produced.

- [ ] **Step 3: Commit**

```bash
git add pipelines/sources/dot_transit.py
git commit -m "feat: add DOT transit ridership pipeline — commuter economic activity"
```

---

## Task 10: Apartment List Rent Estimates

**Files:**
- Create: `pipelines/sources/apartment_list.py`

- [ ] **Step 1: Create apartment_list.py**

```python
"""
Apartment List rent estimates pipeline — independent metro rent data.

Source: Apartment List Research
https://www.apartmentlist.com/research/category/data-rent-estimates

Monthly rent estimates + vacancy rates by metro. Independent methodology
from Zillow ZORI — cross-validates and adds vacancy rate signal.

Published as public CSV.
"""

import json
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

# Apartment List publishes rent estimates CSV
AL_RENT_URL = "https://www.apartmentlist.com/research/hubfs/Data/rent_estimates_msa.csv"
# Vacancy rate data
AL_VACANCY_URL = "https://www.apartmentlist.com/research/hubfs/Data/vacancy_index_msa.csv"

# Map our metros to Apartment List MSA names
AL_METRO_MAP = {m.id: f"{m.name}, {m.state}" for m in METROS}
AL_METRO_MAP["dca"] = "Washington, DC"


def try_download(urls: list[str]) -> pd.DataFrame | None:
    """Try multiple URLs, return first successful download."""
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

    # Download rent estimates
    print("  Downloading rent estimates...")
    rent_urls = [
        AL_RENT_URL,
        "https://www.apartmentlist.com/research/hubfs/Data/rent_estimates_metro.csv",
        "https://www.apartmentlist.com/research/hubfs/rent_estimates.csv",
    ]
    rent_df = try_download(rent_urls)

    # Download vacancy rates
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

        # Identify location column
        loc_col = None
        for col in rent_df.columns:
            if any(kw in col.lower() for kw in ["location", "msa", "metro", "name", "region"]):
                loc_col = col
                break
        if not loc_col:
            loc_col = rent_df.columns[0]

        # Identify date/value columns (wide format with months as columns)
        meta_cols = [c for c in rent_df.columns if not c[0].isdigit() and "-" not in c[:5]]
        date_cols = [c for c in rent_df.columns if c not in meta_cols]
        if not date_cols:
            # All columns after the first few are dates
            date_cols = list(rent_df.columns[3:])
        recent_dates = sorted(date_cols)[-24:]

        for metro in METROS:
            al_name = AL_METRO_MAP.get(metro.id, metro.name)
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

            # YoY rent change
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

    # Add vacancy data if available
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
                    # Find matching month in existing points
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
```

- [ ] **Step 2: Run and verify**

Run: `cd /Users/alexanderfinan/vibe-cession-index && pipelines/.venv/bin/python pipelines/sources/apartment_list.py`
Expected: Apartment List CSV URLs may have changed — the pipeline tries multiple URL patterns.

- [ ] **Step 3: Commit**

```bash
git add pipelines/sources/apartment_list.py
git commit -m "feat: add Apartment List rent estimates — independent rent + vacancy data"
```

---

## Task 11: Yelp Local Business Activity

**Files:**
- Create: `pipelines/sources/yelp_local.py`

- [ ] **Step 1: Create yelp_local.py**

```python
"""
Yelp Local Economic Activity pipeline — local business openings/closings.

Source: Yelp Fusion API (free tier, 5000 calls/day).
Tracks the ratio of recently opened vs recently closed businesses per metro.
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

# Categories that reflect local economic health
CATEGORIES = ["restaurants", "coffee", "retail", "bars"]


def search_businesses(location: str, attributes: str = "", categories: str = "") -> dict:
    """Search Yelp for businesses matching criteria."""
    if not YELP_API_KEY:
        return {"total": 0}

    headers = {"Authorization": f"Bearer {YELP_API_KEY}"}
    params = {
        "location": location,
        "limit": 1,  # We only need the total count
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

        # Count total businesses
        total = search_businesses(location, categories=",".join(CATEGORIES))
        time.sleep(0.5)

        # Count recently opened (hot_and_new attribute)
        new_biz = search_businesses(location, attributes="hot_and_new", categories=",".join(CATEGORIES))
        time.sleep(0.5)

        # Count open now (proxy for active businesses)
        open_now = search_businesses(location, attributes="open_now", categories=",".join(CATEGORIES))
        time.sleep(0.5)

        total_count = total["total"]
        new_count = new_biz["total"]
        open_count = open_now["total"]

        # New business ratio: what fraction of local businesses are new?
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
```

- [ ] **Step 2: Run and verify**

Run: `cd /Users/alexanderfinan/vibe-cession-index && pipelines/.venv/bin/python pipelines/sources/yelp_local.py`
Expected: Without YELP_API_KEY set, writes empty output gracefully. With key, gets business counts per metro.

- [ ] **Step 3: Commit**

```bash
git add pipelines/sources/yelp_local.py
git commit -m "feat: add Yelp local business activity — street-level economic health"
```

---

## Task 12: Google Trends — Survival Mode Terms

**Files:**
- Create: `pipelines/sources/google_trends_survival.py`
- Modify: `pipelines/config.py` (add SURVIVAL_TERMS)

- [ ] **Step 1: Add SURVIVAL_TERMS to config.py**

Add after ASPIRATION_TERMS in `pipelines/config.py`:

```python
# Survival-mode search terms — people in acute financial distress
SURVIVAL_TERMS = [
    "food bank near me",
    "sell plasma",
    "rent help",
    "second job",
    "can't pay rent",
]

# Migration intent search terms — people considering relocating
MIGRATION_TERMS = [
    "moving to",
    "cost of living",
    "best places to live",
    "apartments for rent",
    "jobs hiring near me",
]
```

- [ ] **Step 2: Create google_trends_survival.py**

```python
"""
Google Trends survival-mode pipeline — tracks acute financial distress searches.

These terms capture people in crisis mode: "food bank near me", "sell plasma",
"rent help". This is a more extreme distress signal than the standard anxiety
ratio — it captures the population that's past worrying and into surviving.
"""

import json
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

from pytrends.request import TrendReq

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, SURVIVAL_TERMS, OUTPUT_DIR


def main():
    print("=== Google Trends Survival Mode Pipeline ===")
    end = datetime.now()
    start = end - timedelta(days=365)
    timeframe = f"{start.strftime('%Y-%m-%d')} {end.strftime('%Y-%m-%d')}"
    print(f"Timeframe: {timeframe}")
    print(f"Terms: {SURVIVAL_TERMS}")

    pytrends = TrendReq(hl="en-US", tz=360)
    all_data = {}

    for i, metro in enumerate(METROS):
        geo = f"US-{metro.state}-{metro.google_dma}"
        print(f"[{i+1}/{len(METROS)}] {metro.name} ({geo})")

        weekly: dict[str, dict[str, float]] = {}
        try:
            pytrends.build_payload(SURVIVAL_TERMS, timeframe=timeframe, geo=geo)
            df = pytrends.interest_over_time()
            if df is not None and not df.empty:
                for col in SURVIVAL_TERMS:
                    if col in df.columns:
                        for date, value in df[col].items():
                            week_str = date.strftime("%Y-%m-%d")
                            if week_str not in weekly:
                                weekly[week_str] = {}
                            weekly[week_str][col] = float(value)
        except Exception as e:
            print(f"    Warning: {e}")

        # Compute weekly survival index
        weeks = []
        for week_str in sorted(weekly.keys()):
            vals = weekly[week_str]
            avg = sum(vals.values()) / max(len(vals), 1)
            weeks.append({
                "week": week_str,
                "survival_index": round(avg, 2),
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

    output_path = OUTPUT_DIR / "google_trends_survival.json"
    with open(output_path, "w") as f:
        json.dump(all_data, f, indent=2)
    print(f"\nSaved to {output_path}")
    print(f"Metros with data: {sum(1 for v in all_data.values() if v['weeks'])}/{len(METROS)}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Commit**

```bash
git add pipelines/config.py pipelines/sources/google_trends_survival.py
git commit -m "feat: add survival-mode Google Trends — acute financial distress searches"
```

---

## Task 13: Google Trends — Migration Intent

**Files:**
- Create: `pipelines/sources/google_trends_migration.py`

- [ ] **Step 1: Create google_trends_migration.py**

```python
"""
Google Trends migration intent pipeline — tracks people considering relocation.

"Moving to {city}", "cost of living", "best places to live" searches
reveal which metros people are fleeing vs. flocking to.
High inbound search = economic optimism about a metro.
High outbound search = people trying to escape.
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
```

- [ ] **Step 2: Commit**

```bash
git add pipelines/sources/google_trends_migration.py
git commit -m "feat: add migration intent Google Trends — inbound vs outbound interest"
```

---

## Task 14: Fed Survey Financial Fragility

**Files:**
- Create: `pipelines/sources/fed_survey.py`

- [ ] **Step 1: Create fed_survey.py**

```python
"""
Federal Reserve financial fragility pipeline.

Source: FRED carries key indicators from the Fed's Survey of Consumer Finances
and Survey of Household Economics and Decisionmaking (SHED).

"Can you cover a $400 emergency?" is the ultimate vibes-vs-reality datapoint.
Also tracks debt burden, financial fragility, and emergency savings.
"""

import json
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

# FRED series for financial fragility / stress indicators
FRAGILITY_SERIES = {
    # Debt service ratios
    "debt_service_ratio": {
        "id": "TDSP",
        "name": "Household Debt Service Ratio",
        "unit": "%",
        "description": "Required debt payments as % of disposable income",
    },
    "financial_obligations": {
        "id": "FODSP",
        "name": "Financial Obligations Ratio",
        "unit": "%",
        "description": "Broader obligations (debt + rent + insurance + auto leases) as % of income",
    },
    # Consumer debt levels
    "revolving_credit": {
        "id": "REVOLSL",
        "name": "Revolving Consumer Credit (Credit Cards)",
        "unit": "Billions $",
        "description": "Total revolving credit outstanding — credit card debt",
    },
    "student_loans": {
        "id": "SLOAS",
        "name": "Student Loans Outstanding",
        "unit": "Billions $",
        "description": "Total student loan debt — disproportionately affects young people",
    },
    # Savings / cushion
    "savings_deposits": {
        "id": "SAVINGS",
        "name": "Savings Deposits at Banks",
        "unit": "Billions $",
        "description": "Total savings deposits — are people building or depleting cushions?",
    },
    "personal_savings_rate": {
        "id": "PSAVERT",
        "name": "Personal Savings Rate",
        "unit": "%",
        "description": "Share of disposable income being saved",
    },
    # Hardship proxies
    "auto_delinq_90": {
        "id": "DRALACBS",
        "name": "Auto Loan Delinquency 90+ Days",
        "unit": "%",
        "description": "Severe auto loan delinquency — people can't make car payments",
    },
    "cc_delinq_90": {
        "id": "DRCCLACBS",
        "name": "Credit Card Delinquency 90+ Days",
        "unit": "%",
        "description": "Severe credit card delinquency",
    },
}


def fetch_fred_csv(series_id: str, start_date: str) -> list[dict]:
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}&cosd={start_date}"
    try:
        df = pd.read_csv(url)
        if df.empty:
            return []
        df.columns = ["date", "value"]
        df["value"] = pd.to_numeric(df["value"], errors="coerce")
        df = df.dropna(subset=["value"])
        return [{"date": str(row["date"]), "value": round(float(row["value"]), 3)} for _, row in df.iterrows()]
    except Exception:
        return []


def main():
    print("=== Fed Financial Fragility Pipeline ===")
    start_date = (datetime.now() - timedelta(days=1900)).strftime("%Y-%m-%d")

    all_series = {}
    print("\nFetching fragility indicators:")
    for key, spec in FRAGILITY_SERIES.items():
        print(f"  {spec['name']}...", end=" ")
        points = fetch_fred_csv(spec["id"], start_date)
        points = points[-104:]  # Last ~2 years
        all_series[key] = {
            "name": spec["name"],
            "unit": spec["unit"],
            "description": spec["description"],
            "points": points,
        }
        print(f"{len(points)} pts")
        time.sleep(0.3)

    # Compute a simple fragility composite
    # Higher debt service + lower savings = more fragile
    latest = {}
    for key, data in all_series.items():
        if data["points"]:
            latest[key] = data["points"][-1]["value"]

    fragility_score = None
    if "debt_service_ratio" in latest and "personal_savings_rate" in latest:
        # Simple: high debt burden / low savings = fragile
        debt = latest["debt_service_ratio"]
        savings = latest["personal_savings_rate"]
        # Normalize: debt 10-15% range, savings 2-10% range
        fragility_score = round(debt / max(savings, 0.5), 2)
        print(f"\n  Fragility ratio (debt/savings): {fragility_score}")
        print(f"    Debt service: {debt}%, Savings rate: {savings}%")

    output = {
        "series": all_series,
        "latest_snapshot": latest,
        "fragility_ratio": fragility_score,
        "scope": "national",
        "note": "National-level indicators — state/metro breakdowns not available from FRED",
    }

    output_path = OUTPUT_DIR / "fed_survey.json"
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nSaved to {output_path}")
    print(f"Series with data: {sum(1 for v in all_series.values() if v['points'])}/{len(FRAGILITY_SERIES)}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run and verify**

Run: `cd /Users/alexanderfinan/vibe-cession-index && pipelines/.venv/bin/python pipelines/sources/fed_survey.py`
Expected: All series from FRED should return data. Fragility ratio should be computed.

- [ ] **Step 3: Commit**

```bash
git add pipelines/sources/fed_survey.py
git commit -m "feat: add Fed financial fragility pipeline — debt burden vs savings cushion"
```

---

## Task 15: Update Taxonomy

**Files:**
- Modify: `pipelines/taxonomy.py`

- [ ] **Step 1: Add new categories to taxonomy**

In `pipelines/taxonomy.py`, add these categories to existing domains:

In the `"housing"` domain categories, add:
```python
            "rental": "Rent prices, rent indices (Zillow ZORI, Apartment List, HUD FMR)",
```

In the `"consumer"` domain categories, add:
```python
            "hardship": "Financial hardship, difficulty paying bills, food insecurity",
            "fragility": "Debt burden, savings cushion, financial obligations",
```

In the `"demographics"` domain categories, add:
```python
            "safety-net": "SNAP enrollment, transfer payments, social services",
            "mobility": "Migration intent, relocation patterns, transit ridership",
```

In the `"labor"` domain categories, add:
```python
            "wages-metro": "Metro-level average weekly wages (QCEW)",
```

In the `"business"` domain categories, add:
```python
            "local": "Local business openings/closings, small business street-level health",
```

- [ ] **Step 2: Add classification rules for new categories**

In the `classify_series` function, add these patterns before the fallback:

```python
    # Rental
    elif "rent" in name_lower or "zori" in name_lower or "fmr" in name_lower:
        primary = "housing.rental"
    # Hardship
    elif "hardship" in name_lower or "difficulty" in name_lower or "pulse" in name_lower:
        primary = "consumer.hardship"
    # Safety net
    elif "snap" in name_lower or "food stamp" in name_lower:
        primary = "demographics.safety-net"
    # Transit
    elif "transit" in name_lower or "ridership" in name_lower:
        primary = "demographics.mobility"
    # Local business
    elif "yelp" in name_lower or "local business" in name_lower:
        primary = "business.local"
    # QCEW wages
    elif "weekly wage" in name_lower or "qcew" in name_lower:
        primary = "labor.wages-metro"
    # Migration
    elif "migration" in name_lower or "moving" in name_lower:
        primary = "demographics.mobility"
    # Survival
    elif "survival" in name_lower or "sell plasma" in name_lower or "food bank" in name_lower:
        primary = "consumer.hardship"
    # Financial fragility
    elif "fragil" in name_lower or "debt service" in name_lower or "financial obligation" in name_lower:
        primary = "consumer.fragility"
```

- [ ] **Step 3: Commit**

```bash
git add pipelines/taxonomy.py
git commit -m "feat: extend taxonomy with rental, hardship, safety-net, mobility categories"
```

---

## Task 16: Update run_all.py

**Files:**
- Modify: `pipelines/run_all.py`

- [ ] **Step 1: Add new sources to pipeline runner**

In `pipelines/run_all.py`, add these `run()` calls in the `main()` function. Insert them after the existing source calls and before `compute_index.py`:

```python
    # --- New inclusivity sources ---
    run("sources/zillow_rents.py", "Zillow ZORI — Metro Rent Prices")
    run("sources/apartment_list.py", "Apartment List — Independent Rent Estimates")
    run("sources/hud_fmr.py", "HUD — Fair Market Rents")
    run("sources/usda_snap.py", "USDA — SNAP Enrollment (Food Insecurity)")
    run("sources/bls_qcew.py", "BLS QCEW — Metro Average Weekly Wages")
    run("sources/census_pulse.py", "Census Pulse — Household Financial Hardship")
    run("sources/opportunity_insights.py", "Opportunity Insights — Spending by Income Quartile")
    run("sources/fed_survey.py", "Fed Survey — Financial Fragility Indicators")
    run("sources/dot_transit.py", "DOT — Transit Ridership")
    run("sources/reddit_sentiment.py", "Reddit — Economic Sentiment")
    run("sources/yelp_local.py", "Yelp — Local Business Activity")

    if not skip_trends:
        run("sources/google_trends_survival.py", "Google Trends — Survival Mode Searches")
        run("sources/google_trends_migration.py", "Google Trends — Migration Intent")
```

- [ ] **Step 2: Commit**

```bash
git add pipelines/run_all.py
git commit -m "feat: register all 13 new data sources in pipeline runner"
```

---

## Task 17: Update compute_index.py Signal Weights

**Files:**
- Modify: `pipelines/compute_index.py:27-38` (SIGNAL_WEIGHTS dict)

- [ ] **Step 1: Add new signals to SIGNAL_WEIGHTS**

Replace the existing `SIGNAL_WEIGHTS` dict with rebalanced weights that include new signals. The total must still sum to 1.0:

```python
SIGNAL_WEIGHTS = {
    # --- Behavioral signals (vibes) ---
    "google_trends_anxiety": 0.12,   # Search behavior — core vibes signal
    "survival_search": 0.06,         # "food bank near me", "sell plasma" — acute distress
    "reddit_sentiment": 0.05,        # Community mood from subreddit analysis
    "ai_job_ratio": 0.04,            # AI vs traditional job search ratio
    "migration_intent": 0.03,        # Are people trying to leave this metro?
    # --- Official / market signals ---
    "unemployment_rate": 0.10,       # BLS metro unemployment
    "initial_claims": 0.08,          # FRED weekly jobless claims
    "wage_growth": 0.06,             # QCEW metro wage growth vs inflation
    "housing_inventory": 0.08,       # Redfin active listings
    "housing_dom": 0.05,             # Redfin days on market
    "housing_price_drops": 0.05,     # Redfin % of listings with price cuts
    "rent_change": 0.06,             # Zillow ZORI YoY rent change
    "new_biz_apps": 0.10,            # FRED weekly new business applications (state)
    # --- Inclusivity signals ---
    "snap_enrollment": 0.04,         # USDA SNAP participation (food insecurity)
    "delinquency_rate": 0.04,        # FRED credit card/auto delinquency
    "financial_fragility": 0.04,     # Debt service ratio vs savings rate
}
```

Note: weights sum to 1.0.

- [ ] **Step 2: Add signal extraction logic for new signals**

In `compute_index.py`, in the section where signals are extracted per metro (the function that builds weekly signal values), add extraction logic for each new signal. This follows the existing pattern of loading JSON from OUTPUT_DIR and mapping values to weekly dates. The specific implementation depends on the existing extraction code structure — read the full `compute_index.py` before implementing to match its patterns exactly.

- [ ] **Step 3: Run compute_index to verify rebalanced weights work**

Run: `cd /Users/alexanderfinan/vibe-cession-index && pipelines/.venv/bin/python pipelines/compute_index.py`
Expected: Index computes with available signals. Missing signals get zero weight and remaining signals are re-normalized (existing behavior per the docstring).

- [ ] **Step 4: Commit**

```bash
git add pipelines/compute_index.py
git commit -m "feat: rebalance index weights with inclusivity signals (rent, SNAP, delinquency, wages)"
```

---

## Summary

| Task | Source | Type | Effort |
|------|--------|------|--------|
| 1 | FRED Delinquency | Modify existing | 2 min |
| 2 | Zillow ZORI | New collector | 5 min |
| 3 | USDA SNAP | New collector | 5 min |
| 4 | BLS QCEW | New collector | 5 min |
| 5 | Census Pulse | New collector | 5 min |
| 6 | Opportunity Insights | New collector | 5 min |
| 7 | HUD FMR | New collector | 5 min |
| 8 | Reddit Sentiment | New collector | 5 min |
| 9 | DOT Transit | New collector | 5 min |
| 10 | Apartment List | New collector | 5 min |
| 11 | Yelp Local | New collector | 5 min |
| 12 | Google Trends Survival | New + config modify | 5 min |
| 13 | Google Trends Migration | New collector | 5 min |
| 14 | Fed Survey Fragility | New collector | 5 min |
| 15 | Taxonomy Update | Modify existing | 3 min |
| 16 | run_all.py Update | Modify existing | 2 min |
| 17 | compute_index.py Weights | Modify existing | 5 min |

**Total: 17 tasks, 13 new source files, 4 file modifications**
