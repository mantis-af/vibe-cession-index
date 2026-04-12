"""
FRED Bulk Fetcher Round 2 — State GDP, income, Treasury curve,
regional Fed surveys, commodities, productivity, government debt.
"""

import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from db import upsert_source, upsert_series, insert_datapoints, get_stats

START_DATE = (datetime.now() - timedelta(days=1900)).strftime("%Y-%m-%d")

STATES = [
    "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN",
    "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
    "NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT",
    "VT","VA","WA","WV","WI","WY",
]
STATE_NAMES = {
    "AL":"Alabama","AK":"Alaska","AZ":"Arizona","AR":"Arkansas","CA":"California",
    "CO":"Colorado","CT":"Connecticut","DE":"Delaware","DC":"District of Columbia",
    "FL":"Florida","GA":"Georgia","HI":"Hawaii","ID":"Idaho","IL":"Illinois",
    "IN":"Indiana","IA":"Iowa","KS":"Kansas","KY":"Kentucky","LA":"Louisiana",
    "ME":"Maine","MD":"Maryland","MA":"Massachusetts","MI":"Michigan","MN":"Minnesota",
    "MS":"Mississippi","MO":"Missouri","MT":"Montana","NE":"Nebraska","NV":"Nevada",
    "NH":"New Hampshire","NJ":"New Jersey","NM":"New Mexico","NY":"New York",
    "NC":"North Carolina","ND":"North Dakota","OH":"Ohio","OK":"Oklahoma",
    "OR":"Oregon","PA":"Pennsylvania","RI":"Rhode Island","SC":"South Carolina",
    "SD":"South Dakota","TN":"Tennessee","TX":"Texas","UT":"Utah","VT":"Vermont",
    "VA":"Virginia","WA":"Washington","WV":"West Virginia","WI":"Wisconsin","WY":"Wyoming",
}


def fetch_fred(series_id: str) -> list[tuple[str, float]]:
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}&cosd={START_DATE}"
    try:
        df = pd.read_csv(url)
        if df.empty: return []
        df.columns = ["date", "value"]
        df["value"] = pd.to_numeric(df["value"], errors="coerce")
        df = df.dropna(subset=["value"])
        return [(str(r["date"]), float(r["value"])) for _, r in df.iterrows()]
    except Exception:
        return []


def store(series_id, db_id, name, category, scope, unit, frequency, state=None, desc=""):
    pts = fetch_fred(series_id)
    if not pts: return 0
    upsert_series(db_id, name, category, scope, unit, frequency, "fred",
                  source_series_id=series_id, state=state, description=desc)
    insert_datapoints(db_id, pts)
    return len(pts)


def main():
    print("=== FRED Bulk Fetcher Round 2 ===")
    upsert_source("fred", "FRED", "https://fred.stlouisfed.org", "Federal Reserve Economic Data")
    total_new = 0
    total_pts = 0

    # ─── 1. State Real GDP ───
    print("\n--- State GDP (quarterly) ---")
    for st in STATES:
        sid = f"{st}NGSP"
        n = store(sid, f"state_{st.lower()}_gdp", f"{STATE_NAMES[st]} GDP",
                  "GDP", "state", "Millions $", "annual", state=st)
        if n: total_new += 1; total_pts += n
        time.sleep(0.25)
    print(f"  Done: {total_new} series")

    # ─── 2. State Personal Income Per Capita ───
    print("\n--- State per capita income ---")
    ct = 0
    for st in STATES:
        sid = f"{st}PCPI"
        n = store(sid, f"state_{st.lower()}_pcpi", f"{STATE_NAMES[st]} Per Capita Income",
                  "Income", "state", "$", "annual", state=st)
        if n: total_new += 1; total_pts += n; ct += 1
        time.sleep(0.25)
    print(f"  Done: {ct} states")

    # ─── 3. Treasury Yield Curve (full term structure) ───
    print("\n--- Treasury yield curve ---")
    yields = {
        "DGS1MO": ("1-Month Treasury", "1M"),
        "DGS3MO": ("3-Month Treasury", "3M"),
        "DGS6MO": ("6-Month Treasury", "6M"),
        "DGS1": ("1-Year Treasury", "1Y"),
        "DGS2": ("2-Year Treasury", "2Y"),
        "DGS3": ("3-Year Treasury", "3Y"),
        "DGS5": ("5-Year Treasury", "5Y"),
        "DGS7": ("7-Year Treasury", "7Y"),
        "DGS10": ("10-Year Treasury", "10Y"),
        "DGS20": ("20-Year Treasury", "20Y"),
        "DGS30": ("30-Year Treasury", "30Y"),
    }
    for sid, (name, tenor) in yields.items():
        n = store(sid, f"yield_{tenor.lower()}", f"{name} Yield",
                  "Rates", "national", "%", "daily",
                  desc=f"Constant maturity {tenor} Treasury yield")
        if n: total_new += 1; total_pts += n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 4. Regional Fed Surveys ───
    print("\n--- Regional Fed surveys ---")
    fed_surveys = {
        "GACDISA066MSFRBNY": ("Empire State Manufacturing", "NY Fed"),
        "GACDFSA066MSFRBPHI": ("Philly Fed Manufacturing", "Philadelphia Fed"),
        "DALLCBMI": ("Dallas Fed Manufacturing", "Dallas Fed"),
        "KCFSI": ("KC Fed Financial Stress", "Kansas City Fed"),
        "RICSRMA": ("Richmond Fed Manufacturing", "Richmond Fed"),
        "CFSBCQ": ("Chicago Fed Business Conditions", "Chicago Fed"),
    }
    for sid, (name, source) in fed_surveys.items():
        n = store(sid, f"fedsurvey_{sid.lower()}", name,
                  "Surveys", "national", "Index", "monthly",
                  desc=f"Regional {source} survey index")
        if n: total_new += 1; total_pts += n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 5. Commodities ───
    print("\n--- Commodities ---")
    commodities = {
        "DCOILWTICO": ("WTI Crude Oil", "$/barrel", "daily"),
        "DCOILBRENTEU": ("Brent Crude Oil", "$/barrel", "daily"),
        "DHHNGSP": ("Henry Hub Natural Gas", "$/MMBtu", "daily"),
        "GOLDAMGBD228NLBM": ("Gold (London Fix)", "$/oz", "daily"),
        "DEXUSAL": ("Aluminum Price (LME)", "$/mt", "daily"),
        "PCOPPUSDM": ("Copper Price", "$/mt", "monthly"),
        "PMAIZMTUSDM": ("Corn Price", "$/mt", "monthly"),
        "PWHEAMTUSDM": ("Wheat Price", "$/mt", "monthly"),
        "PSOYBUSDM": ("Soybean Price", "$/mt", "monthly"),
        "PCOFFOTMUSDM": ("Coffee Price", "$/kg", "monthly"),
        "PCOALAUUSDM": ("Coal Price (Australia)", "$/mt", "monthly"),
        "PNICKUSDM": ("Nickel Price", "$/mt", "monthly"),
        "PZINCUSDM": ("Zinc Price", "$/mt", "monthly"),
        "PLOGORE": ("Iron Ore Price", "$/mt", "monthly"),
        "WPU0561": ("PPI Lumber", "Index", "monthly"),
        "APU0000708111": ("CPI Avg Price: Eggs", "$/dozen", "monthly"),
        "APU0000703112": ("CPI Avg Price: Ground Beef", "$/lb", "monthly"),
        "APU0000709112": ("CPI Avg Price: Milk", "$/gal", "monthly"),
    }
    for sid, (name, unit, freq) in commodities.items():
        n = store(sid, f"commodity_{sid.lower()}", name,
                  "Commodities", "national", unit, freq)
        if n: total_new += 1; total_pts += n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 6. Government Debt / Fiscal ───
    print("\n--- Government debt & fiscal ---")
    fiscal = {
        "GFDEBTN": ("Federal Debt Total", "Millions $", "quarterly"),
        "GFDEGDQ188S": ("Federal Debt to GDP", "%", "quarterly"),
        "FYFSD": ("Federal Surplus/Deficit", "Millions $", "annual"),
        "MTSDS133FMS": ("Monthly Treasury Statement Deficit", "Millions $", "monthly"),
        "W006RC1Q027SBEA": ("Federal Gov't Current Expenditures", "Billions $", "quarterly"),
        "FGRECPT": ("Federal Receipts", "Billions $", "quarterly"),
    }
    for sid, (name, unit, freq) in fiscal.items():
        n = store(sid, f"fiscal_{sid.lower()}", name,
                  "Fiscal", "national", unit, freq)
        if n: total_new += 1; total_pts += n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 7. Productivity / Output ───
    print("\n--- Productivity ---")
    productivity = {
        "OPHNFB": ("Nonfarm Business Labor Productivity", "Index", "quarterly"),
        "ULCNFB": ("Unit Labor Costs", "Index", "quarterly"),
        "COMPNFB": ("Nonfarm Business Compensation", "Index", "quarterly"),
        "OUTBS": ("Business Sector Real Output", "Index", "quarterly"),
        "PRS85006092": ("Nonfarm Business Output Per Hour", "Index", "quarterly"),
    }
    for sid, (name, unit, freq) in productivity.items():
        n = store(sid, f"productivity_{sid.lower()}", name,
                  "Production", "national", unit, freq)
        if n: total_new += 1; total_pts += n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 8. Monetary Aggregates ───
    print("\n--- Monetary ---")
    monetary = {
        "BOGMBASE": ("Monetary Base", "Billions $", "monthly"),
        "M1SL": ("M1 Money Stock", "Billions $", "monthly"),
        "M2SL": ("M2 Money Stock", "Billions $", "monthly"),
        "WALCL": ("Fed Total Assets", "Millions $", "weekly"),
        "WTREGEN": ("Fed Treasury Holdings", "Millions $", "weekly"),
        "WSHOMCB": ("Fed MBS Holdings", "Millions $", "weekly"),
        "TOTRESNS": ("Total Reserves", "Billions $", "monthly"),
        "EXCSRESNS": ("Excess Reserves", "Billions $", "monthly"),
    }
    for sid, (name, unit, freq) in monetary.items():
        n = store(sid, f"monetary_{sid.lower()}", name,
                  "Monetary", "national", unit, freq)
        if n: total_new += 1; total_pts += n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 9. Shipping / Logistics ───
    print("\n--- Shipping & logistics ---")
    shipping = {
        "TSIFRGHT": ("Freight Transportation Index", "Index", "monthly"),
        "RAILFRTCARLOADSD11": ("Rail Freight Carloads", "Carloads", "weekly"),
        "LOADD11": ("Truck Tonnage Index", "Index", "monthly"),
    }
    for sid, (name, unit, freq) in shipping.items():
        n = store(sid, f"shipping_{sid.lower()}", name,
                  "Logistics", "national", unit, freq)
        if n: total_new += 1; total_pts += n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 10. Small Business ───
    print("\n--- Small business ---")
    smallbiz = {
        "NFIB": ("NFIB Small Business Optimism", "Index", "monthly"),
        "BUSAPPWNSAUS": ("New Business Applications (National)", "Count", "weekly"),
        "BABATOTALSAUS": ("Business Applications (High-Propensity)", "Count", "weekly"),
    }
    for sid, (name, unit, freq) in smallbiz.items():
        n = store(sid, f"smallbiz_{sid.lower()}", name,
                  "Business", "national", unit, freq)
        if n: total_new += 1; total_pts += n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    stats = get_stats()
    print(f"\n{'='*60}")
    print(f"Round 2 Complete")
    print(f"  New series this run: {total_new}")
    print(f"  New datapoints: {total_pts}")
    print(f"  Total series in DB: {stats['total_series']}")
    print(f"  Total datapoints: {stats['total_datapoints']}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
