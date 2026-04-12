"""
FRED Round 6 — State labor force, sector wages, healthcare,
climate-related, venture/IPO proxies, OECD productivity.
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
    print("=== FRED Round 6 ===")
    t_new = 0; t_pts = 0

    # ─── 1. State labor force participation ───
    print("\n--- State labor force participation ---")
    ct = 0
    for st in STATES:
        sid = f"LBSSA{st}"
        n = store(sid, f"state_{st.lower()}_lfp", f"{STATE_NAMES[st]} Labor Force Participation",
                  "Labor", "state", "%", "monthly", state=st)
        if n: t_new+=1; t_pts+=n; ct+=1
        time.sleep(0.25)
    print(f"  {ct} states")

    # ─── 2. Sector average hourly wages ───
    print("\n--- Sector wages ---")
    sector_wages = {
        "CES0500000003": ("All Private Avg Hourly Earnings", "$"),
        "CES1000000003": ("Mining & Logging Avg Hourly Earnings", "$"),
        "CES2000000003": ("Construction Avg Hourly Earnings", "$"),
        "CES3000000003": ("Manufacturing Avg Hourly Earnings", "$"),
        "CES4000000003": ("Trade/Transport/Util Avg Hourly Earnings", "$"),
        "CES5000000003": ("Information Avg Hourly Earnings", "$"),
        "CES5500000003": ("Financial Avg Hourly Earnings", "$"),
        "CES6000000003": ("Professional/Business Avg Hourly Earnings", "$"),
        "CES6500000003": ("Education/Health Avg Hourly Earnings", "$"),
        "CES7000000003": ("Leisure/Hospitality Avg Hourly Earnings", "$"),
        "CES8000000003": ("Other Services Avg Hourly Earnings", "$"),
    }
    for sid, (name, unit) in sector_wages.items():
        n = store(sid, f"wages_{sid.lower()}", name, "Income", "national", unit, "monthly",
                  desc=f"Average hourly earnings, {name.split(' Avg')[0]}")
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 3. Healthcare / Insurance ───
    print("\n--- Healthcare ---")
    health = {
        "HLTHSCPCHCSA": ("Healthcare PCE", "Billions $", "monthly"),
        "CUSR0000SAM1": ("CPI Medical Care Commodities", "Index", "monthly"),
        "CUSR0000SAM2": ("CPI Medical Care Services", "Index", "monthly"),
        "CUSR0000SEMF01": ("CPI Health Insurance", "Index", "monthly"),
        "PCU62621062621011": ("PPI Hospitals", "Index", "monthly"),
        "PCU62131062131012": ("PPI Physician Services", "Index", "monthly"),
        "CES6562000001": ("Healthcare Employment", "Thousands", "monthly"),
        "CES6561000001": ("Ambulatory Health Employment", "Thousands", "monthly"),
        "CES6562200001": ("Hospital Employment", "Thousands", "monthly"),
        "CES6562300001": ("Nursing Care Employment", "Thousands", "monthly"),
    }
    for sid, (name, unit, freq) in health.items():
        n = store(sid, f"health_{sid.lower()}", name, "Healthcare", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 4. Climate / Weather Economic Indicators ───
    print("\n--- Climate/weather economic ---")
    climate = {
        "CUSR0000SEHF01": ("CPI Electricity", "Index", "monthly"),
        "CUSR0000SEHF02": ("CPI Utility Gas", "Index", "monthly"),
        "CUSR0000SEHE01": ("CPI Fuel Oil", "Index", "monthly"),
        "CPIENGSL": ("CPI Energy (all)", "Index", "monthly"),
        "IPG2211A2N": ("Electric Power Generation", "Index", "monthly"),
        "DJFUELUSGULF": ("Jet Fuel Price (Gulf Coast)", "$/gal", "daily"),
    }
    for sid, (name, unit, freq) in climate.items():
        n = store(sid, f"climate_{sid.lower()}", name, "Energy", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 5. OECD Productivity & Hours ───
    print("\n--- OECD productivity ---")
    oecd = {
        "OPHNFB": ("US Labor Productivity (NFB)", "Index", "quarterly"),
        "ULCNFB": ("US Unit Labor Costs (NFB)", "Index", "quarterly"),
        "COMPNFB": ("US Real Compensation (NFB)", "Index", "quarterly"),
        "HOANBS": ("US Avg Weekly Hours (NFB)", "Hours", "quarterly"),
        "ULCMFG": ("US Unit Labor Costs (Manufacturing)", "Index", "quarterly"),
        "OPHPBS": ("US Productivity (Business Sector)", "Index", "quarterly"),
    }
    for sid, (name, unit, freq) in oecd.items():
        n = store(sid, f"oecd_{sid.lower()}", name, "Production", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 6. Venture / IPO / Innovation Proxies ───
    print("\n--- Innovation proxies ---")
    innovation = {
        "BABATOTALSAUS": ("High-Propensity Business Apps", "Count", "weekly"),
        "Y694RC1Q027SBEA": ("R&D Investment (national)", "Billions $", "quarterly"),
        "BOGZ1FA896006005Q": ("Equity Issuance by Corps", "Billions $", "quarterly"),
        "CES5051200001": ("Computer Systems Design Employment", "Thousands", "monthly"),
        "CES5051100001": ("Data Processing Employment", "Thousands", "monthly"),
        "CES5051500001": ("Other Information Employment", "Thousands", "monthly"),
        "CES5054100001": ("Software Publishers Employment", "Thousands", "monthly"),
    }
    for sid, (name, unit, freq) in innovation.items():
        n = store(sid, f"innov_{sid.lower()}", name, "Technology", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 7. International trade detail ───
    print("\n--- International trade ---")
    trade = {
        "IMPCH": ("Imports from China", "Millions $", "monthly"),
        "EXPCH": ("Exports to China", "Millions $", "monthly"),
        "IMPMX": ("Imports from Mexico", "Millions $", "monthly"),
        "EXPMX": ("Exports to Mexico", "Millions $", "monthly"),
        "IMPCA": ("Imports from Canada", "Millions $", "monthly"),
        "EXPCA": ("Exports to Canada", "Millions $", "monthly"),
        "IMPEU": ("Imports from EU", "Millions $", "monthly"),
        "EXPEU": ("Exports to EU", "Millions $", "monthly"),
        "IMPJP": ("Imports from Japan", "Millions $", "monthly"),
        "EXPJP": ("Exports to Japan", "Millions $", "monthly"),
        "BOPTIMP": ("Total Imports (BOP)", "Billions $", "monthly"),
        "BOPTEXP": ("Total Exports (BOP)", "Billions $", "monthly"),
    }
    for sid, (name, unit, freq) in trade.items():
        n = store(sid, f"trade2_{sid.lower()}", name, "Trade", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 8. State new business applications (fill gaps) ───
    print("\n--- State biz apps (filling gaps) ---")
    ct = 0
    for st in STATES:
        sid = f"BUSAPPWNSA{st}"
        db_id = f"state_{st.lower()}_bizapps"
        n = store(sid, db_id, f"{STATE_NAMES[st]} New Business Applications",
                  "Business", "state", "Count", "weekly", state=st)
        if n: t_new+=1; t_pts+=n; ct+=1
        time.sleep(0.25)
    print(f"  {ct} states")

    stats = get_stats()
    print(f"\n{'='*60}")
    print(f"Round 6 Complete: +{t_new} series, +{t_pts} pts")
    print(f"DB total: {stats['total_series']} series, {stats['total_datapoints']} datapoints")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
