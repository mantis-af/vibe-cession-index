"""
FRED Bulk Fetcher Round 4 — State housing prices (FHFA), energy,
corporate profits, business inventories, construction, wages, crypto.
"""

import sys, time
from datetime import datetime, timedelta
from pathlib import Path
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from db import upsert_source, upsert_series, insert_datapoints, get_stats

START = (datetime.now() - timedelta(days=1900)).strftime("%Y-%m-%d")

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
    print("=== FRED Round 4 ===")
    t_new = 0; t_pts = 0

    # ─── 1. State FHFA House Price Index (all 51) ───
    print("\n--- State house price index (FHFA) ---")
    ct = 0
    for st in STATES:
        sid = f"{st}STHPI"
        n = store(sid, f"state_{st.lower()}_hpi", f"{STATE_NAMES[st]} House Price Index",
                  "Housing", "state", "Index", "quarterly", state=st,
                  desc=f"FHFA all-transactions house price index for {STATE_NAMES[st]}")
        if n: t_new+=1; t_pts+=n; ct+=1
        time.sleep(0.25)
    print(f"  {ct} states")

    # ─── 2. State average weekly wages ───
    print("\n--- State avg weekly wages ---")
    ct = 0
    for st in STATES:
        sid = f"SMS{st[:2]}000000000800003" if len(st) == 2 else None
        # Use QCEW-based series: ENU + FIPS
        # Simpler: state avg hourly earnings aren't on FRED for all.
        # Use state personal income growth rate instead
        sid2 = f"{st}OTOT"  # state total wages/salaries
        n = store(sid2, f"state_{st.lower()}_wages", f"{STATE_NAMES[st]} Wages & Salaries",
                  "Income", "state", "Millions $", "quarterly", state=st)
        if n: t_new+=1; t_pts+=n; ct+=1
        time.sleep(0.25)
    print(f"  {ct} states")

    # ─── 3. Energy ───
    print("\n--- Energy ---")
    energy = {
        "DHHNGSP": ("Henry Hub Natural Gas", "$/MMBtu", "daily"),
        "DCOILWTICO": ("WTI Crude Oil", "$/barrel", "daily"),
        "DPROPANEMBTX": ("Propane Price (TX)", "$/gal", "daily"),
        "GASDESW": ("Diesel Price (National)", "$/gal", "weekly"),
        "ELECPRICEUS": ("US Avg Electricity Price", "cents/kWh", "monthly"),
        "IPG2211A2N": ("Electricity Generation Index", "Index", "monthly"),
        "NGMPUS": ("Natural Gas Marketed Production", "MMcf", "monthly"),
        "MCOILWTICO": ("WTI Crude Monthly Avg", "$/barrel", "monthly"),
        "CLPREXAG": ("US Crude Production", "Thousands bbl/day", "monthly"),
    }
    for sid, (name, unit, freq) in energy.items():
        n = store(sid, f"energy_{sid.lower()}", name, "Energy", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 4. Corporate / Business ───
    print("\n--- Corporate & business ---")
    corporate = {
        "CP": ("Corporate Profits After Tax", "Billions $", "quarterly"),
        "CPROFIT": ("Corporate Profits Before Tax", "Billions $", "quarterly"),
        "CPATAX": ("Corp Profits After Tax (adjusted)", "Billions $", "quarterly"),
        "ISRATIO": ("Inventory/Sales Ratio", "Ratio", "monthly"),
        "RETAILIRSA": ("Retail Inventories", "Millions $", "monthly"),
        "MNFCTRIRSA": ("Manufacturing Inventories", "Millions $", "monthly"),
        "WHLSLRIRSA": ("Wholesale Inventories", "Millions $", "monthly"),
        "TLRESCONS": ("Total Construction Spending", "Millions $", "monthly"),
        "PRRESCONS": ("Private Residential Construction", "Millions $", "monthly"),
        "PNRESCONS": ("Private Nonresidential Construction", "Millions $", "monthly"),
        "TTLCONS": ("Total Construction Workers", "Thousands", "monthly"),
        "A053RC1Q027SBEA": ("National Income", "Billions $", "quarterly"),
        "W068RCQ027SBEA": ("Govt Transfers to Persons", "Billions $", "quarterly"),
        "B230RC0Q173SBEA": ("Personal Dividend Income", "Billions $", "quarterly"),
        "A576RC1": ("Personal Interest Income", "Billions $", "quarterly"),
    }
    for sid, (name, unit, freq) in corporate.items():
        n = store(sid, f"corp_{sid.lower()}", name, "Business", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 5. Technology / Innovation ───
    print("\n--- Technology ---")
    tech = {
        "CES5051200001": ("Computer Systems Design Employment", "Thousands", "monthly"),
        "CES5051100001": ("Data Processing Employment", "Thousands", "monthly"),
        "CES5000000001": ("Information Sector Employment", "Thousands", "monthly"),
        "USAUTVNRMSNSMEI": ("US Auto Vehicle Production", "Vehicles", "monthly"),
        "DGDSRG3Q086SBEA": ("Durable Goods PCE", "Billions $", "quarterly"),
        "Y694RC1Q027SBEA": ("R&D Investment", "Billions $", "quarterly"),
    }
    for sid, (name, unit, freq) in tech.items():
        n = store(sid, f"tech_{sid.lower()}", name, "Technology", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 6. Crypto (via FRED) ───
    print("\n--- Crypto/digital ---")
    crypto = {
        "CBBTCUSD": ("Bitcoin Price (Coinbase)", "$", "daily"),
        "CBETHUSD": ("Ethereum Price (Coinbase)", "$", "daily"),
    }
    for sid, (name, unit, freq) in crypto.items():
        n = store(sid, f"crypto_{sid.lower()}", name, "Crypto", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 7. More international ───
    print("\n--- More international ---")
    more_intl = {
        "DEXUSUK": ("GBP/USD Exchange Rate", "Rate", "daily"),
        "DEXCAUS": ("CAD/USD Exchange Rate", "Rate", "daily"),
        "DEXKOUS": ("KRW/USD Exchange Rate", "Rate", "daily"),
        "DEXBZUS": ("BRL/USD Exchange Rate", "Rate", "daily"),
        "DEXINUS": ("INR/USD Exchange Rate", "Rate", "daily"),
        "DEXMXUS": ("MXN/USD Exchange Rate", "Rate", "daily"),
    }
    for sid, (name, unit, freq) in more_intl.items():
        n = store(sid, f"fx_{sid.lower()}", name, "Markets", "international", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 8. Health/social ───
    print("\n--- Health & social ---")
    health = {
        "HLTHSCPCHCSA": ("Health Care Spending (PCE)", "Billions $", "monthly"),
        "SNAP7MO": ("SNAP Recipients (7-month avg)", "Persons", "monthly"),
        "TRFVOLUSM227SFWA": ("Transfer Volume (Fedwire)", "Billions $", "monthly"),
    }
    for sid, (name, unit, freq) in health.items():
        n = store(sid, f"social_{sid.lower()}", name, "Social", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    stats = get_stats()
    print(f"\n{'='*60}")
    print(f"Round 4 Complete: +{t_new} series, +{t_pts} pts")
    print(f"DB total: {stats['total_series']} series, {stats['total_datapoints']} datapoints")
    print(f"Categories: {stats['categories']}")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
