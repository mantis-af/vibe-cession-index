"""
Affordability Index pipeline — computes a per-metro affordability score.

Combines:
  - Zillow ZHVI (home prices)
  - BLS CPI metro (cost of living)
  - EIA gas prices (regional)
  - FRED state median household income
  - FRED 30-year mortgage rate

Formula: Higher income + lower costs = more affordable.
Score is 0-100 (100 = most affordable).
"""

import json
import sys
import time
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

# State median household income FRED series
STATE_INCOME_SERIES = {
    "NY": "MEHOINUSNYA672N", "CA": "MEHOINUSCAA672N", "TX": "MEHOINUSTXA672N",
    "IL": "MEHOINUSILA672N", "AZ": "MEHOINUSAZA672N", "PA": "MEHOINUSPAA672N",
    "FL": "MEHOINUSFLA672N", "OH": "MEHOINUSOHA672N", "NC": "MEHOINUSNCA672N",
    "IN": "MEHOINUSINA672N", "WA": "MEHOINUSWAA672N", "CO": "MEHOINUSCOA672N",
    "TN": "MEHOINUSTNA672N", "DC": "MEHOINUSDCA672N",
}


def fetch_fred_latest(series_id: str) -> float | None:
    try:
        df = pd.read_csv(f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}&cosd=2023-01-01")
        df.columns = ["date", "value"]
        df["value"] = pd.to_numeric(df["value"], errors="coerce")
        df = df.dropna()
        if df.empty:
            return None
        return float(df.iloc[-1]["value"])
    except:
        return None


def main():
    print("=== Affordability Index Pipeline ===")

    # Load existing data
    zillow = {}
    zillow_path = OUTPUT_DIR / "zillow_zhvi.json"
    if zillow_path.exists():
        with open(zillow_path) as f:
            zillow = json.load(f)

    cpi = {}
    cpi_path = OUTPUT_DIR / "bls_cpi_metro.json"
    if cpi_path.exists():
        with open(cpi_path) as f:
            cpi = json.load(f)

    gas = {}
    gas_path = OUTPUT_DIR / "eia_gas.json"
    if gas_path.exists():
        with open(gas_path) as f:
            gas = json.load(f)

    # Fetch mortgage rate
    print("  Fetching 30Y mortgage rate...")
    mortgage_rate = fetch_fred_latest("MORTGAGE30US") or 7.0
    print(f"    Mortgage rate: {mortgage_rate:.2f}%")

    # Fetch national median income as fallback
    print("  Fetching national median income...")
    national_income = fetch_fred_latest("MEHOINUSA672N") or 75000
    print(f"    National: ${national_income:,.0f}")

    # Fetch state incomes
    state_incomes = {}
    print("  Fetching state median incomes...")
    for state, sid in STATE_INCOME_SERIES.items():
        val = fetch_fred_latest(sid)
        if val:
            state_incomes[state] = val
            print(f"    {state}: ${val:,.0f}")
        time.sleep(0.3)

    # Compute affordability per metro
    all_data = {}
    raw_scores = []  # for normalization

    for metro in METROS:
        # Home price
        z = zillow.get(metro.id, {}).get("points", [])
        home_price = z[-1]["zhvi"] if z else None
        home_yoy = z[-1].get("yoy_pct", 0) if z else 0

        # Income
        income = state_incomes.get(metro.state, national_income)

        # CPI (use national if metro not available)
        metro_cpi = cpi.get(metro.id, cpi.get("_national", {}))
        cpi_points = metro_cpi.get("points", [])
        inflation = None
        if cpi_points:
            latest = cpi_points[-1]
            inflation = latest.get("inflation_yoy")

        # Gas price
        gas_metros = gas.get("metros", {})
        gas_price = None
        if metro.id in gas_metros:
            gp = gas_metros[metro.id].get("points", [])
            if gp:
                gas_price = gp[-1]["price"]

        if not home_price or not income:
            print(f"  {metro.name}: insufficient data, skipping")
            continue

        # --- Affordability formula ---
        # Monthly mortgage payment (30yr fixed, 20% down, P&I only)
        loan = home_price * 0.80
        monthly_rate = mortgage_rate / 100 / 12
        n_payments = 360
        monthly_payment = loan * (monthly_rate * (1 + monthly_rate) ** n_payments) / ((1 + monthly_rate) ** n_payments - 1)

        # Housing cost burden = annual mortgage / annual income
        housing_burden = (monthly_payment * 12) / income

        # Annual gas cost estimate (assume 12k miles/yr, 25mpg)
        annual_gas = (12000 / 25) * (gas_price or 3.50)
        gas_burden = annual_gas / income

        # Inflation penalty (higher inflation = less affordable)
        inflation_penalty = (inflation or 3.0) / 100  # as fraction

        # Total cost burden
        total_burden = housing_burden + gas_burden + inflation_penalty

        # Raw affordability (inverse of burden — lower burden = more affordable)
        raw_afford = 1.0 / total_burden if total_burden > 0 else 1.0
        raw_scores.append((metro.id, raw_afford))

        all_data[metro.id] = {
            "metro": metro.name,
            "state": metro.state,
            "income": round(income),
            "homePrice": round(home_price),
            "monthlyMortgage": round(monthly_payment),
            "housingBurden": round(housing_burden * 100, 1),  # as %
            "gasBurden": round(gas_burden * 100, 1),
            "inflation": round(inflation, 1) if inflation else None,
            "mortgageRate": round(mortgage_rate, 2),
            "homeAppreciation": round(home_yoy, 1),
            "rawScore": raw_afford,
        }

    # Normalize to 0-100 scale
    if raw_scores:
        values = [s for _, s in raw_scores]
        min_v, max_v = min(values), max(values)
        rng = max_v - min_v if max_v > min_v else 1
        for metro_id, raw in raw_scores:
            score = round(((raw - min_v) / rng) * 100)
            all_data[metro_id]["affordabilityScore"] = score

    # Sort and display
    sorted_metros = sorted(all_data.values(), key=lambda x: x.get("affordabilityScore", 0), reverse=True)
    print(f"\n{'Metro':20s} {'Score':>5s} {'Income':>10s} {'Home':>10s} {'Mortgage':>10s} {'Burden':>7s}")
    print("-" * 75)
    for m in sorted_metros:
        print(f"{m['metro']:20s} {m.get('affordabilityScore', 0):5d} ${m['income']:>9,d} ${m['homePrice']:>9,d} ${m['monthlyMortgage']:>9,d} {m['housingBurden']:6.1f}%")

    output_path = OUTPUT_DIR / "affordability.json"
    with open(output_path, "w") as f:
        json.dump(all_data, f, indent=2)
    print(f"\nSaved to {output_path}")


if __name__ == "__main__":
    main()
