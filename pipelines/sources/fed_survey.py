"""
Federal Reserve financial fragility pipeline.

Source: FRED carries key indicators from the Fed's Survey of Consumer Finances.
"Can you cover a $400 emergency?" is the ultimate vibes-vs-reality datapoint.
Tracks debt burden, financial fragility, and emergency savings.
"""

import json
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import METROS, OUTPUT_DIR

FRAGILITY_SERIES = {
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
        points = points[-104:]
        all_series[key] = {
            "name": spec["name"],
            "unit": spec["unit"],
            "description": spec["description"],
            "points": points,
        }
        print(f"{len(points)} pts")
        time.sleep(0.3)

    latest = {}
    for key, data in all_series.items():
        if data["points"]:
            latest[key] = data["points"][-1]["value"]

    fragility_score = None
    if "debt_service_ratio" in latest and "personal_savings_rate" in latest:
        debt = latest["debt_service_ratio"]
        savings = latest["personal_savings_rate"]
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
