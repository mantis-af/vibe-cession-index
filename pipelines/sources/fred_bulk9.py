"""
FRED Round 9 — International GDP per capita, G7 rates, health insurance,
education, state exports, more sector employment, real estate detail.
"""

import sys, time
from datetime import datetime, timedelta
from pathlib import Path
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from db import upsert_source, upsert_series, insert_datapoints, get_stats, ensure_tag, tag_series, add_keywords
from taxonomy import classify_series

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
    primary_tag, keywords = classify_series(db_id, name, cat, scope, unit, freq)
    parts = primary_tag.split(".")
    ensure_tag(primary_tag, parts[0], parts[1] if len(parts)>1 else "other", parts[2] if len(parts)>2 else None)
    tag_series(db_id, primary_tag, is_primary=True)
    add_keywords(db_id, keywords)
    return len(pts)

def main():
    print("=== FRED Round 9 ===")
    t_new = 0; t_pts = 0

    # ─── 1. International GDP per capita ───
    print("\n--- International GDP per capita ---")
    gdppc = {
        "NYGDPPCAPKDUSA": ("US GDP per Capita", "USD"),
        "NYGDPPCAPKDGBR": ("UK GDP per Capita", "USD"),
        "NYGDPPCAPKDDEU": ("Germany GDP per Capita", "USD"),
        "NYGDPPCAPKDJPN": ("Japan GDP per Capita", "USD"),
        "NYGDPPCAPKDCAN": ("Canada GDP per Capita", "USD"),
        "NYGDPPCAPKDFRA": ("France GDP per Capita", "USD"),
        "NYGDPPCAPKDCHN": ("China GDP per Capita", "USD"),
        "NYGDPPCAPKDIND": ("India GDP per Capita", "USD"),
        "NYGDPPCAPKDBRA": ("Brazil GDP per Capita", "USD"),
        "NYGDPPCAPKDKOR": ("South Korea GDP per Capita", "USD"),
        "NYGDPPCAPKDMEX": ("Mexico GDP per Capita", "USD"),
        "NYGDPPCAPKDAUS": ("Australia GDP per Capita", "USD"),
    }
    for sid, (name, unit) in gdppc.items():
        n = store(sid, f"intlgdppc_{sid.lower()}", name, "GDP", "international", unit, "annual")
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 2. G7 Interest Rates + Spreads ───
    print("\n--- G7 interest rates ---")
    g7rates = {
        "IRLTLT01GBM156N": ("UK 10-Year Govt Bond", "%", "monthly"),
        "IRLTLT01DEM156N": ("Germany 10-Year Bund", "%", "monthly"),
        "IRLTLT01JPM156N": ("Japan 10-Year JGB", "%", "monthly"),
        "IRLTLT01CAM156N": ("Canada 10-Year Bond", "%", "monthly"),
        "IRLTLT01FRM156N": ("France 10-Year OAT", "%", "monthly"),
        "IRLTLT01AUM156N": ("Australia 10-Year Bond", "%", "monthly"),
        "IR3TIB01USM156N": ("US 3-Month Interbank", "%", "monthly"),
        "IR3TIB01GBM156N": ("UK 3-Month Interbank", "%", "monthly"),
        "IR3TIB01EZM156N": ("Euro Area 3-Month Interbank", "%", "monthly"),
        "IR3TIB01JPM156N": ("Japan 3-Month Interbank", "%", "monthly"),
    }
    for sid, (name, unit, freq) in g7rates.items():
        n = store(sid, f"g7rate_{sid.lower()}", name, "Rates", "international", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 3. Health Insurance / Healthcare Costs ───
    print("\n--- Health insurance & costs ---")
    health = {
        "HLTHSCPCHCSA": ("Healthcare PCE (SA)", "Billions $", "monthly"),
        "CES6562000001": ("Healthcare Employment", "Thousands", "monthly"),
        "CUSR0000SAM": ("CPI Medical Care", "Index", "monthly"),
        "CUSR0000SEMF01": ("CPI Health Insurance", "Index", "monthly"),
        "PCU62621062621011": ("PPI Hospitals", "Index", "monthly"),
        "HLTHNGDPA": ("Health Spending % of GDP", "%", "annual"),
    }
    for sid, (name, unit, freq) in health.items():
        n = store(sid, f"health2_{sid.lower()}", name, "Healthcare", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 4. Education ───
    print("\n--- Education ---")
    edu = {
        "FGCCSAQ027S": ("Federal Student Loans", "Billions $", "quarterly"),
        "SLOAS": ("Student Loans Outstanding", "Billions $", "quarterly"),
        "CPIHOSSL": ("CPI College Tuition", "Index", "monthly"),
        "CGBD0300A052NBEA": ("State/Local Education Spending", "Billions $", "annual"),
    }
    for sid, (name, unit, freq) in edu.items():
        n = store(sid, f"edu2_{sid.lower()}", name, "Education", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 5. State Exports ───
    print("\n--- State exports ---")
    ct = 0
    for st in STATES:
        sid = f"EXPTOT{st}"
        n = store(sid, f"state_{st.lower()}_exports", f"{STATE_NAMES[st]} Total Exports",
                  "Trade", "state", "Millions $", "quarterly", state=st)
        if n: t_new+=1; t_pts+=n; ct+=1
        time.sleep(0.2)
    print(f"  {ct} states")

    # ─── 6. Sector Employment Detail ───
    print("\n--- Sector employment detail ---")
    sectors = {
        "CES4142000001": ("Wholesale Trade Employment", "Thousands", "monthly"),
        "CES4200000001": ("Retail Trade Employment", "Thousands", "monthly"),
        "CES4300000001": ("Transportation Employment", "Thousands", "monthly"),
        "CES4422000001": ("Warehousing Employment", "Thousands", "monthly"),
        "CES5051200001": ("Computer Systems Design Emp", "Thousands", "monthly"),
        "CES5552000001": ("Insurance Employment", "Thousands", "monthly"),
        "CES5553000001": ("Real Estate Employment", "Thousands", "monthly"),
        "CES6054130001": ("Management Consulting Emp", "Thousands", "monthly"),
        "CES6056100001": ("Administrative Support Emp", "Thousands", "monthly"),
        "CES6561000001": ("Ambulatory Healthcare Emp", "Thousands", "monthly"),
        "CES7071000001": ("Arts & Entertainment Emp", "Thousands", "monthly"),
        "CES7072000001": ("Food Services Emp", "Thousands", "monthly"),
    }
    for sid, (name, unit, freq) in sectors.items():
        n = store(sid, f"sectemp_{sid.lower()}", name, "Labor", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 7. Real Estate Detail ───
    print("\n--- Real estate detail ---")
    realestate = {
        "MORTGAGE15US": ("15-Year Mortgage Rate", "%", "weekly"),
        "MORTGAGE5US": ("5/1 ARM Rate", "%", "weekly"),
        "FRMORTG": ("30-Year FRM Commitment Rate", "%", "monthly"),
        "MSACSR": ("New Home Months Supply", "Months", "monthly"),
        "NHSDPTS": ("New Houses For Sale", "Thousands", "monthly"),
        "ETOTALUSQ176N": ("Home Equity Loans", "Thousands", "quarterly"),
        "RRPONTSYD": ("Fed Reverse Repo (daily)", "Billions $", "daily"),
        "CPIHOSSL": ("CPI Housing (owners equiv)", "Index", "monthly"),
    }
    for sid, (name, unit, freq) in realestate.items():
        n = store(sid, f"re_{sid.lower()}", name, "Housing", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 8. International Trade Balance Detail ───
    print("\n--- Trade detail ---")
    trade = {
        "IMPGS": ("Imports Goods & Services", "Billions $", "quarterly"),
        "EXPGS": ("Exports Goods & Services", "Billions $", "quarterly"),
        "NETEXP": ("Net Exports", "Billions $", "quarterly"),
        "IEABC": ("Current Account Balance", "Billions $", "quarterly"),
        "IMPGSSA": ("Imports Goods (SA)", "Billions $", "monthly"),
        "BOPTEXP": ("BOP Exports", "Billions $", "monthly"),
        "BOPTIMP": ("BOP Imports", "Billions $", "monthly"),
    }
    for sid, (name, unit, freq) in trade.items():
        n = store(sid, f"trade3_{sid.lower()}", name, "Trade", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    stats = get_stats()
    print(f"\n{'='*60}")
    print(f"Round 9 Complete: +{t_new} series, +{t_pts} pts")
    print(f"DB total: {stats['total_series']} series, {stats['total_datapoints']} datapoints")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
