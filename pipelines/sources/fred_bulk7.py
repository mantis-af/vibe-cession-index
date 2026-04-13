"""
FRED Round 7 — Wealth distribution, real wages, state labor force,
bankruptcy, small business lending, immigration proxies.
"""

import sys, time
from datetime import datetime, timedelta
from pathlib import Path
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from db import upsert_source, upsert_series, insert_datapoints, get_stats
from taxonomy import classify_series
from db import ensure_tag, tag_series, add_keywords

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
    # Tag it
    primary_tag, keywords = classify_series(db_id, name, cat, scope, unit, freq)
    parts = primary_tag.split(".")
    domain = parts[0]; category = parts[1] if len(parts) > 1 else "other"
    subcategory = parts[2] if len(parts) > 2 else None
    ensure_tag(primary_tag, domain, category, subcategory)
    tag_series(db_id, primary_tag, is_primary=True)
    add_keywords(db_id, keywords)
    return len(pts)

def main():
    print("=== FRED Round 7 ===")
    t_new = 0; t_pts = 0

    # ─── 1. Wealth Distribution (Fed DFA data) ───
    print("\n--- Wealth distribution ---")
    wealth = {
        "WFRBST01134": ("Top 1% Net Worth Share", "%", "quarterly"),
        "WFRBSN09053": ("Top 1% Corporate Equities Share", "%", "quarterly"),
        "WFRBST01117": ("Next 9% (90-99th) Net Worth Share", "%", "quarterly"),
        "WFRBSB50215": ("Bottom 50% Net Worth Share", "%", "quarterly"),
        "WFRBLN09053": ("Top 1% Net Worth Level", "Billions $", "quarterly"),
        "WFRBLT01026": ("Middle 40-90th Net Worth", "Billions $", "quarterly"),
        "WFRBLB50107": ("Bottom 50% Total Assets", "Billions $", "quarterly"),
        "WFRBLN40080": ("Top 1% Real Estate Holdings", "Billions $", "quarterly"),
        "WFRBLB50004": ("Bottom 50% Checkable Deposits", "Billions $", "quarterly"),
    }
    for sid, (name, unit, freq) in wealth.items():
        n = store(sid, f"wealth_{sid.lower()}", name, "Inequality", "national", unit, freq,
                  desc=f"Federal Reserve Distributional Financial Accounts — {name}")
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 2. Real Wages (inflation-adjusted) ───
    print("\n--- Real wages ---")
    real_wages = {
        "LES1252881600Q": ("Real Median Weekly Earnings", "$", "quarterly"),
        "CES0500000003": ("Avg Hourly Earnings (nominal)", "$", "monthly"),
        "AHETPI": ("Avg Hourly Earnings (production)", "$", "monthly"),
        "ECIWAG": ("Employment Cost Index: Wages", "Index", "quarterly"),
        "ECIALLCIV": ("Employment Cost Index: Total", "Index", "quarterly"),
        "CES0500000011": ("Real Avg Hourly Earnings", "$", "monthly"),
        "CES0500000012": ("Real Avg Weekly Earnings", "$", "monthly"),
    }
    for sid, (name, unit, freq) in real_wages.items():
        n = store(sid, f"realwage_{sid.lower()}", name, "Income", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 3. State Labor Force (try multiple ID patterns) ───
    print("\n--- State labor force ---")
    ct = 0
    for st in STATES:
        # Try LBSSA pattern (seasonally adjusted labor force level)
        for pattern in [f"LBSSA{st}", f"{st}LF", f"LASST{st}0000000000003"]:
            n = store(pattern, f"state_{st.lower()}_laborforce", f"{STATE_NAMES[st]} Labor Force",
                      "Labor", "state", "Thousands", "monthly", state=st)
            if n:
                t_new+=1; t_pts+=n; ct+=1
                break
            time.sleep(0.2)
    print(f"  {ct} states")

    # ─── 4. Bankruptcy ───
    print("\n--- Bankruptcy ---")
    bankruptcy = {
        "TNBBFIN": ("Total Nonfarm Business Bankruptcies", "Count", "quarterly"),
        "TNBBUSQ": ("Total Business Bankruptcies", "Count", "quarterly"),
    }
    for sid, (name, unit, freq) in bankruptcy.items():
        n = store(sid, f"bankrupt_{sid.lower()}", name, "Business", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 5. Small Business Lending ───
    print("\n--- Small business lending ---")
    sblending = {
        "EVANQ": ("Bank Lending Standards: C&I (Large)", "%", "quarterly"),
        "DRTSCIS": ("Tightening C&I Loans (Small)", "%", "quarterly"),
        "DRTSCLCC": ("Tightening Credit Cards", "%", "quarterly"),
        "BUSLOANS": ("Total C&I Loans Outstanding", "Billions $", "monthly"),
        "NCLNFSBQ": ("Delinquency Rate: C&I Loans", "%", "quarterly"),
        "NCLNRESBQ": ("Delinquency Rate: RE Loans", "%", "quarterly"),
        "DRCCLACBS": ("Charge-Off Rate: Credit Cards", "%", "quarterly"),
        "DRALACBS": ("Charge-Off Rate: All Loans", "%", "quarterly"),
    }
    for sid, (name, unit, freq) in sblending.items():
        n = store(sid, f"lending_{sid.lower()}", name, "Banking", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 6. Immigration / Population Flow Proxies ───
    print("\n--- Immigration proxies ---")
    immigration = {
        "SMPOPNETM": ("Net International Migration", "Persons", "monthly"),
        "POPTHM": ("US Population Monthly", "Thousands", "monthly"),
        "LNU05000000": ("Not in Labor Force", "Thousands", "monthly"),
        "LNS11000000": ("Civilian Labor Force Level", "Thousands", "monthly"),
        "LNS11300000": ("Labor Force Participation Rate", "%", "monthly"),
        "LNS12032194": ("Foreign Born Employment", "Thousands", "monthly"),
        "LNU02073395": ("Foreign Born Labor Force", "Thousands", "monthly"),
    }
    for sid, (name, unit, freq) in immigration.items():
        n = store(sid, f"immig_{sid.lower()}", name, "Demographics", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 7. More Leading / Coincident Indicators ───
    print("\n--- Additional indicators ---")
    additional = {
        "USREC": ("NBER Recession Indicator", "Binary", "monthly"),
        "CFNAI": ("Chicago Fed National Activity", "Index", "monthly"),
        "AMDMUO": ("Unfilled Durable Goods Orders", "Millions $", "monthly"),
        "KCFSI": ("KC Financial Stress Index", "Index", "monthly"),
        "STLFSI2": ("St. Louis Financial Stress", "Index", "weekly"),
        "NFCI": ("Chicago Fed Financial Conditions", "Index", "weekly"),
        "ANFCI": ("Adjusted NFCI", "Index", "weekly"),
        "PERMIT": ("Building Permits Total", "Thousands", "monthly"),
        "HOUST": ("Housing Starts Total", "Thousands", "monthly"),
        "UMCSENT": ("Consumer Sentiment (UMich)", "Index", "monthly"),
    }
    for sid, (name, unit, freq) in additional.items():
        n = store(sid, f"indicator_{sid.lower()}", name, "Leading", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 8. Income by Percentile ───
    print("\n--- Income percentiles ---")
    income_pct = {
        "FIXHAI": ("Housing Affordability Index", "Index", "monthly"),
        "MEHOINUSA672N": ("Median Household Income (US)", "$", "annual"),
        "MEPAINUSA672N": ("Median Personal Income (US)", "$", "annual"),
        "PINCOME": ("Personal Income (total)", "Billions $", "monthly"),
        "A576RC1": ("Personal Interest Income", "Billions $", "quarterly"),
        "A041RC1Q027SBEA": ("Personal Rental Income", "Billions $", "quarterly"),
    }
    for sid, (name, unit, freq) in income_pct.items():
        n = store(sid, f"incomepct_{sid.lower()}", name, "Income", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    stats = get_stats()
    print(f"\n{'='*60}")
    print(f"Round 7 Complete: +{t_new} series, +{t_pts} pts")
    print(f"DB total: {stats['total_series']} series, {stats['total_datapoints']} datapoints")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
