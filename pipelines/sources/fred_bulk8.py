"""
FRED Round 8 — Regional price parities, state housing permits,
corporate bonds, international productivity, ag production.
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
    print("=== FRED Round 8 ===")
    t_new = 0; t_pts = 0

    # ─── 1. Regional Price Parities (cost of living by state) ───
    print("\n--- Regional price parities ---")
    ct = 0
    for st in STATES:
        sid = f"STTMINWG{st}"  # state minimum wage — proxy
        n = store(sid, f"state_{st.lower()}_minwage", f"{STATE_NAMES[st]} Min Wage",
                  "Income", "state", "$/hr", "annual", state=st)
        if n: t_new+=1; t_pts+=n; ct+=1
        time.sleep(0.2)
    # Also try actual RPP series
    for st in STATES:
        sid = f"RPP{st}"  # Regional Price Parity
        n = store(sid, f"state_{st.lower()}_rpp", f"{STATE_NAMES[st]} Regional Price Parity",
                  "Prices", "state", "Index", "annual", state=st,
                  desc=f"BEA Regional Price Parity — cost of living relative to US average (100)")
        if n: t_new+=1; t_pts+=n; ct+=1
        time.sleep(0.2)
    print(f"  {ct} state series")

    # ─── 2. State Housing Permits ───
    print("\n--- State housing permits ---")
    ct = 0
    for st in STATES:
        # Try BPPRIVSA pattern (building permits, private, SA)
        for pattern in [f"{st}BPPRIVSA", f"BPPRIV{st}"]:
            n = store(pattern, f"state_{st.lower()}_permits", f"{STATE_NAMES[st]} Building Permits",
                      "Housing", "state", "Units", "monthly", state=st)
            if n: t_new+=1; t_pts+=n; ct+=1; break
            time.sleep(0.15)
    print(f"  {ct} states")

    # ─── 3. Corporate Bond Yields by Rating ───
    print("\n--- Corporate bonds ---")
    bonds = {
        "AAA": ("Moody's AAA Corp Yield", "%"),
        "BAA": ("Moody's BAA Corp Yield", "%"),
        "AAA10Y": ("AAA-10Y Spread", "%"),
        "BAA10Y": ("BAA-10Y Spread", "%"),
        "BAMLC0A1CAAA": ("BofA AAA OAS", "%"),
        "BAMLC0A4CBBB": ("BofA BBB OAS", "%"),
        "BAMLH0A0HYM2": ("BofA High Yield OAS", "%"),
        "BAMLC0A0CM": ("BofA Investment Grade OAS", "%"),
        "BAMLH0A1HYBB": ("BofA BB OAS", "%"),
        "BAMLH0A2HYB": ("BofA B OAS", "%"),
        "BAMLH0A3HYC": ("BofA CCC+ OAS", "%"),
        "DAAA": ("AAA Corporate Bond Yield (daily)", "%"),
        "DBAA": ("BAA Corporate Bond Yield (daily)", "%"),
    }
    for sid, (name, unit) in bonds.items():
        freq = "daily" if sid.startswith("D") else "monthly" if len(sid) < 6 else "daily"
        n = store(sid, f"bond_{sid.lower()}", name, "Markets", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 4. International Productivity & Hours ───
    print("\n--- International productivity ---")
    intl_prod = {
        "ULCALLRLQDEA": ("Germany Unit Labor Cost", "Index", "quarterly"),
        "ULCALLRLQJPA": ("Japan Unit Labor Cost", "Index", "quarterly"),
        "ULCALLRLQGBA": ("UK Unit Labor Cost", "Index", "quarterly"),
        "ULCALLRLQCAA": ("Canada Unit Labor Cost", "Index", "quarterly"),
        "LCEAMN01EZQ661S": ("Euro Area Labor Cost Index", "Index", "quarterly"),
    }
    for sid, (name, unit, freq) in intl_prod.items():
        n = store(sid, f"intlprod_{sid.lower()}", name, "Production", "international", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 5. Agricultural Prices & Production ───
    print("\n--- Agriculture ---")
    ag = {
        "PMAIZMTUSDM": ("Corn Price (Global)", "$/mt", "monthly"),
        "PWHEAMTUSDM": ("Wheat Price (Global)", "$/mt", "monthly"),
        "PSOYBUSDM": ("Soybean Price (Global)", "$/mt", "monthly"),
        "PBEEFUSDM": ("Beef Price", "$/lb", "monthly"),
        "PPORKUSDM": ("Pork Price", "$/lb", "monthly"),
        "PPOILUSDM": ("Palm Oil Price", "$/mt", "monthly"),
        "PRUBBSGUSDM": ("Rubber Price", "$/kg", "monthly"),
        "PTIMBUSDM": ("Timber Price", "$/cm", "monthly"),
        "PWOOLUSDM": ("Wool Price", "$/kg", "monthly"),
        "WPU01": ("PPI Farm Products", "Index", "monthly"),
        "WPU02": ("PPI Processed Foods", "Index", "monthly"),
        "WPU03": ("PPI Textile Products", "Index", "monthly"),
    }
    for sid, (name, unit, freq) in ag.items():
        n = store(sid, f"ag_{sid.lower()}", name, "Commodities", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 6. Venture Capital / Innovation ───
    print("\n--- Innovation / VC proxies ---")
    vc = {
        "BOGZ1FA896006005Q": ("Corporate Equity Issuance", "Billions $", "quarterly"),
        "BOGZ1FL893064105Q": ("Mutual Fund Shares Outstanding", "Billions $", "quarterly"),
        "BOGZ1FL103064105Q": ("Nonfinancial Corp Equities", "Billions $", "quarterly"),
        "WILL5000IND": ("Wilshire 5000 Total Market", "Index", "daily"),
        "VXOCLS": ("CBOE S&P 100 Volatility", "Index", "daily"),
    }
    for sid, (name, unit, freq) in vc.items():
        n = store(sid, f"vc_{sid.lower()}", name, "Markets", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 7. Additional Consumer Series ───
    print("\n--- Consumer detail ---")
    consumer = {
        "CUSR0000SS62031": ("CPI Internet Services", "Index", "monthly"),
        "CUSR0000SEHA": ("CPI Rent of Primary Residence", "Index", "monthly"),
        "CUSR0000SEHC": ("CPI Owners Equivalent Rent", "Index", "monthly"),
        "CUSR0000SA0L1E": ("CPI All Items Less Food & Energy", "Index", "monthly"),
        "CUSR0000SA0L5": ("CPI All Items Less Medical Care", "Index", "monthly"),
        "CUSR0000SETA01": ("CPI New Vehicles", "Index", "monthly"),
        "CUSR0000SETA02": ("CPI Used Cars & Trucks", "Index", "monthly"),
        "CUSR0000SAR": ("CPI Recreation", "Index", "monthly"),
        "CUSR0000SAA": ("CPI Apparel", "Index", "monthly"),
    }
    for sid, (name, unit, freq) in consumer.items():
        n = store(sid, f"cpigran_{sid.lower()}", name, "Prices", "national", unit, freq,
                  desc=f"BLS Consumer Price Index — {name}")
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 8. State Tax Revenue (proxy: state GDP) ───
    print("\n--- State economic indicators ---")
    ct = 0
    for st in STATES:
        # Real GDP by state
        sid = f"{st}RGSP"
        n = store(sid, f"state_{st.lower()}_realgdp", f"{STATE_NAMES[st]} Real GDP",
                  "GDP", "state", "Millions $", "annual", state=st)
        if n: t_new+=1; t_pts+=n; ct+=1
        time.sleep(0.2)
    print(f"  {ct} state real GDP series")

    stats = get_stats()
    print(f"\n{'='*60}")
    print(f"Round 8 Complete: +{t_new} series, +{t_pts} pts")
    print(f"DB total: {stats['total_series']} series, {stats['total_datapoints']} datapoints")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
