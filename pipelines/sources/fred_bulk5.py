"""
FRED Bulk Fetcher Round 5 — State nonfarm payrolls (correct IDs),
more commodities, education/student debt, inequality, real estate,
agriculture, transportation.
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
# FIPS codes for the SMS series
STATE_FIPS = {
    "AL":"01","AK":"02","AZ":"04","AR":"05","CA":"06","CO":"08","CT":"09","DE":"10",
    "DC":"11","FL":"12","GA":"13","HI":"15","ID":"16","IL":"17","IN":"18","IA":"19",
    "KS":"20","KY":"21","LA":"22","ME":"23","MD":"24","MA":"25","MI":"26","MN":"27",
    "MS":"28","MO":"29","MT":"30","NE":"31","NV":"32","NH":"33","NJ":"34","NM":"35",
    "NY":"36","NC":"37","ND":"38","OH":"39","OK":"40","OR":"41","PA":"42","RI":"44",
    "SC":"45","SD":"46","TN":"47","TX":"48","UT":"49","VT":"50","VA":"51","WA":"53",
    "WV":"54","WI":"55","WY":"56",
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
    print("=== FRED Round 5 ===")
    t_new = 0; t_pts = 0

    # ─── 1. State nonfarm payrolls (correct FRED IDs: SMSxxYYYYYYYY01) ───
    print("\n--- State nonfarm payrolls ---")
    ct = 0
    for st in STATES:
        fips = STATE_FIPS.get(st)
        if not fips: continue
        sid = f"SMS{fips}000000000001"  # Total nonfarm, SA
        n = store(sid, f"state_{st.lower()}_nonfarm", f"{STATE_NAMES[st]} Nonfarm Payrolls",
                  "Labor", "state", "Thousands", "monthly", state=st,
                  desc=f"Total nonfarm employment for {STATE_NAMES[st]}, seasonally adjusted")
        if n: t_new+=1; t_pts+=n; ct+=1
        time.sleep(0.25)
    print(f"  {ct} states with data")

    # ─── 2. More commodities ───
    print("\n--- More commodities ---")
    commodities = {
        "PCOTTPUSDM": ("Cotton Price", "$/mt", "monthly"),
        "PSUGAISAUSDM": ("Sugar Price (World)", "$/mt", "monthly"),
        "PCOCOUSDM": ("Cocoa Price", "$/mt", "monthly"),
        "PPLTUSDM": ("Platinum Price", "$/oz", "monthly"),
        "PPALLDUSDM": ("Palladium Price", "$/oz", "monthly"),
        "PBARLUSDM": ("Barley Price", "$/mt", "monthly"),
        "PRICENPQUSDM": ("Rice Price", "$/mt", "monthly"),
        "POILBREUSDM": ("Brent Crude (monthly)", "$/barrel", "monthly"),
        "POILWTIUSDM": ("WTI Crude (monthly)", "$/barrel", "monthly"),
        "PNRGINDEXM": ("Energy Price Index (IMF)", "Index", "monthly"),
        "PALLFNFINDEXM": ("Food Price Index (IMF)", "Index", "monthly"),
        "PMETAINDEXM": ("Metals Price Index (IMF)", "Index", "monthly"),
        "PRAWMINDEXM": ("Raw Materials Index (IMF)", "Index", "monthly"),
    }
    for sid, (name, unit, freq) in commodities.items():
        n = store(sid, f"commodity2_{sid.lower()}", name, "Commodities", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 3. Education / Student Debt ───
    print("\n--- Education & student debt ---")
    education = {
        "SLOAS": ("Student Loans Outstanding", "Billions $", "quarterly"),
        "FGCCSAQ027S": ("Federal Student Loans", "Billions $", "quarterly"),
        "HHMSDODNS": ("Household Mortgage Debt", "Billions $", "quarterly"),
        "ASTDSL": ("Delinquent Student Loans", "Billions $", "quarterly"),
        "CPIHOSSL": ("CPI Tuition & Fees", "Index", "monthly"),
    }
    for sid, (name, unit, freq) in education.items():
        n = store(sid, f"edu_{sid.lower()}", name, "Education", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 4. Inequality / Poverty ───
    print("\n--- Inequality & poverty ---")
    inequality = {
        "SIPOVGINIUSA": ("US Gini Coefficient", "Index", "annual"),
        "MEFAINUSA672N": ("Median Family Income", "$", "annual"),
        "MEHOINUSA672N": ("Median Household Income", "$", "annual"),
        "PPAAUS00000A156N": ("Poverty Rate", "%", "annual"),
        "LES1252881600Q": ("Median Usual Weekly Earnings", "$", "quarterly"),
        "LEU0252881600A": ("Median Earnings (25+)", "$", "annual"),
    }
    for sid, (name, unit, freq) in inequality.items():
        n = store(sid, f"ineq_{sid.lower()}", name, "Inequality", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 5. Real Estate / Commercial ───
    print("\n--- Real estate ---")
    realestate = {
        "USSTHPI": ("US FHFA House Price Index", "Index", "quarterly"),
        "CSUSHPINSA": ("Case-Shiller 20-City", "Index", "monthly"),
        "SPCS20RSA": ("Case-Shiller 20-City SA", "Index", "monthly"),
        "SPCS10RSA": ("Case-Shiller 10-City SA", "Index", "monthly"),
        "FIXHAI": ("Housing Affordability Index", "Index", "monthly"),
        "BOGZ1FL075035503Q": ("Nonfinancial Corp Real Estate", "Billions $", "quarterly"),
    }
    for sid, (name, unit, freq) in realestate.items():
        n = store(sid, f"realestate_{sid.lower()}", name, "Housing", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 6. Agriculture ───
    print("\n--- Agriculture ---")
    agriculture = {
        "PCEPINDG": ("Food PCE Price Index", "Index", "monthly"),
        "CUSR0000SAF1": ("CPI Food at Home", "Index", "monthly"),
        "CUSR0000SEFV": ("CPI Food Away from Home", "Index", "monthly"),
        "WPU01": ("PPI Farm Products", "Index", "monthly"),
        "WPU02": ("PPI Processed Foods", "Index", "monthly"),
    }
    for sid, (name, unit, freq) in agriculture.items():
        n = store(sid, f"agri_{sid.lower()}", name, "Agriculture", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 7. Transportation ───
    print("\n--- Transportation ---")
    transport = {
        "TSIFRGHT": ("Freight Transport Index", "Index", "monthly"),
        "TRFVOLUSM227NFWA": ("Air Transport Revenue Miles", "Millions", "monthly"),
        "TOTALSA": ("Total Vehicle Sales", "Millions", "monthly"),
        "MRTSSM44111USS": ("New Car Dealer Sales", "Millions $", "monthly"),
        "GASDESW": ("Diesel Fuel Price", "$/gal", "weekly"),
        "CUSR0000SETG01": ("CPI Airlines", "Index", "monthly"),
    }
    for sid, (name, unit, freq) in transport.items():
        n = store(sid, f"transport_{sid.lower()}", name, "Transportation", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ─── 8. Household balance sheet ───
    print("\n--- Household balance sheet ---")
    household = {
        "BOGZ1FL153064005Q": ("Household Net Worth", "Billions $", "quarterly"),
        "BOGZ1FL154090005Q": ("Household Total Assets", "Billions $", "quarterly"),
        "BOGZ1FL154190005Q": ("Household Total Liabilities", "Billions $", "quarterly"),
        "BOGZ1FL153165105Q": ("Household Equity Holdings", "Billions $", "quarterly"),
        "TDSP": ("Debt Service Ratio", "%", "quarterly"),
        "MDSP": ("Mortgage Debt Service Ratio", "%", "quarterly"),
        "CDSP": ("Consumer Debt Service Ratio", "%", "quarterly"),
        "FODSP": ("Financial Obligations Ratio", "%", "quarterly"),
    }
    for sid, (name, unit, freq) in household.items():
        n = store(sid, f"household_{sid.lower()}", name, "Consumer", "national", unit, freq)
        if n: t_new+=1; t_pts+=n; print(f"  {name}: {n} pts")
        time.sleep(0.3)

    stats = get_stats()
    print(f"\n{'='*60}")
    print(f"Round 5 Complete: +{t_new} series, +{t_pts} pts")
    print(f"DB total: {stats['total_series']} series, {stats['total_datapoints']} datapoints")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
