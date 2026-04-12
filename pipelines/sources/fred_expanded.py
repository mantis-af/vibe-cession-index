"""
FRED Expanded pipeline — pulls a wide array of national + state economic data.

National series: financial markets, housing, consumer, business, leading indicators.
State series: new business applications (weekly!), coincident economic index.

All via FRED CSV download — no API key needed.
"""

import json
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

# --- National series ---
NATIONAL_SERIES = {
    # Financial Markets
    "mortgage_30y": {"id": "MORTGAGE30US", "name": "30-Year Mortgage Rate", "unit": "%", "freq": "weekly"},
    "sp500": {"id": "SP500", "name": "S&P 500", "unit": "Index", "freq": "daily"},
    "vix": {"id": "VIXCLS", "name": "VIX Volatility", "unit": "Index", "freq": "daily"},
    "yield_curve": {"id": "T10Y2Y", "name": "Yield Curve (10Y-2Y)", "unit": "%", "freq": "daily"},
    "hy_spread": {"id": "BAMLH0A0HYM2", "name": "High Yield Spread", "unit": "%", "freq": "daily"},
    # Housing
    "housing_starts": {"id": "HOUST", "name": "Housing Starts", "unit": "Thousands", "freq": "monthly"},
    "case_shiller": {"id": "CSUSHPINSA", "name": "Case-Shiller Home Price", "unit": "Index", "freq": "monthly"},
    # Consumer
    "savings_rate": {"id": "PSAVERT", "name": "Personal Savings Rate", "unit": "%", "freq": "monthly"},
    "disposable_income": {"id": "DSPIC96", "name": "Real Disposable Income", "unit": "Billions $", "freq": "monthly"},
    "vehicle_sales": {"id": "TOTALSA", "name": "Total Vehicle Sales", "unit": "Millions", "freq": "monthly"},
    "consumer_credit": {"id": "TOTALSL", "name": "Consumer Credit", "unit": "Billions $", "freq": "monthly"},
    # Business / Labor
    "new_biz_apps": {"id": "BUSAPPWNSAUS", "name": "New Business Applications", "unit": "Count", "freq": "weekly"},
    "job_openings": {"id": "JTSJOL", "name": "Job Openings (JOLTS)", "unit": "Thousands", "freq": "monthly"},
    "quit_rate": {"id": "JTSQUR", "name": "Quit Rate (JOLTS)", "unit": "%", "freq": "monthly"},
    "continued_claims": {"id": "CCSA", "name": "Continued Claims", "unit": "Count", "freq": "weekly"},
    # Leading
    "transport_index": {"id": "TSIFRGHT", "name": "Transportation Index", "unit": "Index", "freq": "monthly"},
    "m2_money": {"id": "M2SL", "name": "M2 Money Supply", "unit": "Billions $", "freq": "monthly"},
}

# --- State-level series ---
# New Business Applications by state (weekly — incredibly valuable)
# Auto-generate from all unique states in METROS
_STATES = sorted(set(m.state for m in METROS))
STATE_BIZ_APPS = {st: f"BUSAPPWNSA{st}" for st in _STATES}
STATE_COINCIDENT = {st: f"{st}PHCI" for st in _STATES}


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
    except Exception as e:
        return []


def main():
    print("=== FRED Expanded Pipeline ===")
    start_date = (datetime.now() - timedelta(days=730)).strftime("%Y-%m-%d")  # 2 years

    # --- National ---
    national = {}
    print("\nNational series:")
    for key, spec in NATIONAL_SERIES.items():
        print(f"  {spec['name']}...", end=" ")
        points = fetch_fred_csv(spec["id"], start_date)
        # For daily series, aggregate to weekly
        if spec["freq"] == "daily" and points:
            df = pd.DataFrame(points)
            df["date"] = pd.to_datetime(df["date"])
            df = df.set_index("date").resample("W-MON").mean().reset_index()
            points = [{"date": row["date"].strftime("%Y-%m-%d"), "value": round(float(row["value"]), 3)}
                      for _, row in df.dropna().iterrows()]
        # Keep last 104 weeks / 24 months
        points = points[-104:]
        national[key] = {
            "name": spec["name"],
            "unit": spec["unit"],
            "frequency": "weekly" if spec["freq"] == "daily" else spec["freq"],
            "points": points,
        }
        print(f"{len(points)} pts")
        time.sleep(0.3)

    # --- State: New Business Applications ---
    state_biz = {}
    print("\nState new business applications:")
    for state, sid in STATE_BIZ_APPS.items():
        print(f"  {state}...", end=" ")
        points = fetch_fred_csv(sid, start_date)
        points = points[-104:]
        state_biz[state] = {"points": points}
        print(f"{len(points)} pts")
        time.sleep(0.3)

    # --- State: Coincident Index ---
    state_coincident = {}
    print("\nState coincident economic index:")
    for state, sid in STATE_COINCIDENT.items():
        print(f"  {state}...", end=" ")
        points = fetch_fred_csv(sid, start_date)
        points = points[-24:]
        state_coincident[state] = {"points": points}
        print(f"{len(points)} pts")
        time.sleep(0.3)

    # Map state data to metros
    metro_state_data = {}
    for metro in METROS:
        st = metro.state
        metro_state_data[metro.id] = {
            "bizApps": state_biz.get(st, {}).get("points", []),
            "coincidentIndex": state_coincident.get(st, {}).get("points", []),
        }

    output = {
        "national": national,
        "stateBusinessApps": state_biz,
        "stateCoincident": state_coincident,
        "metroStateData": metro_state_data,
    }

    output_path = OUTPUT_DIR / "fred_expanded.json"
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nSaved to {output_path}")
    print(f"National series: {len(national)}")
    print(f"State biz apps: {len(state_biz)} states")
    print(f"State coincident: {len(state_coincident)} states")


if __name__ == "__main__":
    main()
