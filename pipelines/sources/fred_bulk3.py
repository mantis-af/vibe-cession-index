"""
FRED Bulk Fetcher Round 3 — International data, bank lending,
consumer expectations, leading indicators, demographic.
"""

import sys, time
from datetime import datetime, timedelta
from pathlib import Path
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from db import upsert_source, upsert_series, insert_datapoints, get_stats

START = (datetime.now() - timedelta(days=1900)).strftime("%Y-%m-%d")

def fetch(sid):
    try:
        df = pd.read_csv(f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={sid}&cosd={START}")
        if df.empty: return []
        df.columns = ["date","value"]
        df["value"] = pd.to_numeric(df["value"], errors="coerce")
        df = df.dropna(subset=["value"])
        return [(str(r["date"]), float(r["value"])) for _, r in df.iterrows()]
    except: return []

def store(sid, db_id, name, cat, scope, unit, freq, desc="", **kw):
    pts = fetch(sid)
    if not pts: return 0
    upsert_series(db_id, name, cat, scope, unit, freq, "fred",
                  source_series_id=sid, description=desc, **kw)
    insert_datapoints(db_id, pts)
    return len(pts)

def main():
    print("=== FRED Round 3: International + More ===")
    upsert_source("fred","FRED","https://fred.stlouisfed.org","Federal Reserve Economic Data")
    upsert_source("world_bank","World Bank (via FRED)","https://data.worldbank.org","International economic data")
    t_new = 0; t_pts = 0

    # ─── International GDP (quarterly, via FRED) ───
    print("\n--- International GDP ---")
    intl_gdp = {
        "CLVMNACSCAB1GQEA19": ("Euro Area GDP","EUR"),
        "NAEXKP01CNQ661S": ("China GDP","CHN"),
        "NAEXKP01JPQ661S": ("Japan GDP","JPN"),
        "NAEXKP01GBQ189S": ("UK GDP","GBR"),
        "NAEXKP01CAQ189S": ("Canada GDP","CAN"),
        "NAEXKP01DEQ661S": ("Germany GDP","DEU"),
        "NAEXKP01FRQ661S": ("France GDP","FRA"),
        "NAEXKP01INQ661S": ("India GDP","IND"),
        "NAEXKP01BRQ661S": ("Brazil GDP","BRA"),
        "NAEXKP01AUQ661S": ("Australia GDP","AUS"),
        "NAEXKP01KRQ661S": ("South Korea GDP","KOR"),
        "NAEXKP01MXQ661S": ("Mexico GDP","MEX"),
    }
    for sid, (name, iso) in intl_gdp.items():
        n = store(sid, f"intl_{iso.lower()}_gdp", name, "GDP", "international", "Index", "quarterly", desc=f"{name} (real, seasonally adjusted)")
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── International unemployment ───
    print("\n--- International unemployment ---")
    intl_unemp = {
        "LRHUTTTTEZM156S": ("Euro Area Unemployment","EUR"),
        "LRHUTTTTCNM156S": ("China Unemployment","CHN"),
        "LRHUTTTTJPM156S": ("Japan Unemployment","JPN"),
        "LRHUTTTTGBM156S": ("UK Unemployment","GBR"),
        "LRHUTTTTCAM156S": ("Canada Unemployment","CAN"),
        "LRHUTTTTDEM156S": ("Germany Unemployment","DEU"),
        "LRHUTTTTFRM156S": ("France Unemployment","FRA"),
        "LRHUTTTTBRM156S": ("Brazil Unemployment","BRA"),
        "LRHUTTTTAUM156S": ("Australia Unemployment","AUS"),
        "LRHUTTTTKRM156S": ("South Korea Unemployment","KOR"),
        "LRHUTTTTMXM156S": ("Mexico Unemployment","MEX"),
    }
    for sid, (name, iso) in intl_unemp.items():
        n = store(sid, f"intl_{iso.lower()}_unemployment", f"{name} Rate", "Labor", "international", "%", "monthly")
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── International CPI ───
    print("\n--- International CPI/inflation ---")
    intl_cpi = {
        "CPALTT01EZM659N": ("Euro Area CPI","EUR"),
        "CPALTT01CNM659N": ("China CPI","CHN"),
        "CPALTT01JPM659N": ("Japan CPI","JPN"),
        "CPALTT01GBM659N": ("UK CPI","GBR"),
        "CPALTT01CAM659N": ("Canada CPI","CAN"),
        "CPALTT01DEM659N": ("Germany CPI","DEU"),
        "CPALTT01BRM659N": ("Brazil CPI","BRA"),
        "CPALTT01INM659N": ("India CPI","IND"),
        "CPALTT01MXM659N": ("Mexico CPI","MEX"),
    }
    for sid, (name, iso) in intl_cpi.items():
        n = store(sid, f"intl_{iso.lower()}_cpi", f"{name} YoY", "Prices", "international", "%", "monthly")
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── International policy rates ───
    print("\n--- International policy rates ---")
    intl_rates = {
        "IRSTCI01EZM156N": ("ECB Policy Rate","EUR"),
        "IRSTCI01JPM156N": ("Japan Policy Rate","JPN"),
        "IRSTCI01GBM156N": ("UK Policy Rate","GBR"),
        "IRSTCI01CAM156N": ("Canada Policy Rate","CAN"),
    }
    for sid, (name, iso) in intl_rates.items():
        n = store(sid, f"intl_{iso.lower()}_rate", name, "Rates", "international", "%", "monthly")
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── Leading Indicators ───
    print("\n--- Leading indicators ---")
    leading = {
        "USSLIND": ("Conference Board Leading Index", "Index", "monthly"),
        "USPHCI": ("Philadelphia Fed Coincident Index", "Index", "monthly"),
        "RECPROUSM156N": ("Recession Probability (Smoothed)", "%", "monthly"),
        "T10Y2Y": ("Yield Curve (10Y-2Y)", "%", "daily"),
        "SAHM": ("Sahm Rule Recession Indicator", "%", "monthly"),
        "CPALTT01USM657N": ("US CPI Growth Rate", "%", "monthly"),
    }
    for sid, (name, unit, freq) in leading.items():
        n = store(sid, f"leading_{sid.lower()}", name, "Leading", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── Bank Lending ───
    print("\n--- Bank lending ---")
    banking = {
        "TOTLL": ("Total Loans & Leases", "Billions $", "weekly"),
        "TOTCI": ("Commercial & Industrial Loans", "Billions $", "weekly"),
        "REALLN": ("Real Estate Loans", "Billions $", "weekly"),
        "CONSUMER": ("Consumer Loans", "Billions $", "weekly"),
        "DRTSCILM": ("Senior Loan Officer Survey: Tightening CI", "%", "quarterly"),
        "DRTSCLCC": ("Senior Loan Officer Survey: Tightening CC", "%", "quarterly"),
        "H8B1058NCBCMG": ("Large Bank Deposits", "Billions $", "weekly"),
    }
    for sid, (name, unit, freq) in banking.items():
        n = store(sid, f"banking_{sid.lower()}", name, "Banking", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── Consumer Expectations ───
    print("\n--- Consumer expectations ---")
    expectations = {
        "MICH": ("UMich Inflation Expectations (1yr)", "%", "monthly"),
        "EXPINF10YR": ("Expected Inflation (10yr)", "%", "monthly"),
        "UMCSENT": ("Consumer Sentiment", "Index", "monthly"),
        "CSCICP03USM665S": ("Consumer Confidence OECD", "Index", "monthly"),
    }
    for sid, (name, unit, freq) in expectations.items():
        n = store(sid, f"expect_{sid.lower()}", name, "Surveys", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── Population ───
    print("\n--- Population ---")
    pop = {
        "POPTHM": ("US Population (Monthly)", "Thousands", "monthly"),
        "LFWA64TTUSM647S": ("Working Age Population", "Persons", "monthly"),
        "SMPOPNETM": ("Net Migration", "Persons", "monthly"),
    }
    for sid, (name, unit, freq) in pop.items():
        n = store(sid, f"pop_{sid.lower()}", name, "Demographics", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    stats = get_stats()
    print(f"\n{'='*60}")
    print(f"Round 3 Complete: +{t_new} series, +{t_pts} pts")
    print(f"DB total: {stats['total_series']} series, {stats['total_datapoints']} datapoints")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
