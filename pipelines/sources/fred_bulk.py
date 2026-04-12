"""
FRED Bulk Fetcher — systematically pulls large sets of economic series from FRED.

Categories of data to pull:
1. State-level employment (all 50 states)
2. State-level income
3. State-level GDP
4. National industry employment (by sector)
5. National trade data
6. National production
7. National financial conditions
8. Regional price indices
9. Manufacturing data
10. Small business data

All via FRED CSV download — no API key needed.
"""

import json
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from db import upsert_source, upsert_series, insert_datapoints, get_stats

# 5-year lookback
START_DATE = (datetime.now() - timedelta(days=1900)).strftime("%Y-%m-%d")

# All US state codes
STATES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL",
    "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME",
    "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH",
    "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
    "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
]

STATE_NAMES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
    "DC": "District of Columbia", "FL": "Florida", "GA": "Georgia", "HI": "Hawaii",
    "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
    "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine",
    "MD": "Maryland", "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota",
    "MS": "Mississippi", "MO": "Missouri", "MT": "Montana", "NE": "Nebraska",
    "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico",
    "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio",
    "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island",
    "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas",
    "UT": "Utah", "VT": "Vermont", "VA": "Virginia", "WA": "Washington",
    "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
}


def fetch_fred(series_id: str) -> list[tuple[str, float]]:
    """Fetch a FRED series and return [(date, value), ...]"""
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}&cosd={START_DATE}"
    try:
        df = pd.read_csv(url)
        if df.empty:
            return []
        df.columns = ["date", "value"]
        df["value"] = pd.to_numeric(df["value"], errors="coerce")
        df = df.dropna(subset=["value"])
        return [(str(row["date"]), float(row["value"])) for _, row in df.iterrows()]
    except Exception:
        return []


def fetch_and_store(series_id: str, db_id: str, name: str, category: str,
                     scope: str, unit: str, frequency: str, source_id: str,
                     state: str = None, description: str = ""):
    """Fetch a FRED series and store in SQLite."""
    points = fetch_fred(series_id)
    if not points:
        return 0

    upsert_series(
        series_id=db_id,
        name=name,
        category=category,
        scope=scope,
        unit=unit,
        frequency=frequency,
        source_id=source_id,
        source_series_id=series_id,
        state=state,
        description=description,
    )
    insert_datapoints(db_id, points)
    return len(points)


def main():
    print("=== FRED Bulk Fetcher ===")
    upsert_source("fred", "Federal Reserve Economic Data (FRED)",
                   "https://fred.stlouisfed.org",
                   "800,000+ economic time series from the St. Louis Fed")

    total_new = 0
    total_points = 0

    # ──────────────────────────────────────────────
    # 1. State-level unemployment rate (all 50 + DC)
    # ──────────────────────────────────────────────
    print("\n--- State unemployment rates ---")
    for st in STATES:
        sid = f"{st}UR"
        db_id = f"state_{st.lower()}_unemployment"
        n = fetch_and_store(sid, db_id, f"{STATE_NAMES[st]} Unemployment Rate",
                           "Labor", "state", "%", "monthly", "fred", state=st,
                           description=f"Monthly unemployment rate for {STATE_NAMES[st]}")
        if n:
            total_new += 1
            total_points += n
            print(f"  {st}: {n} pts")
        time.sleep(0.3)

    # ──────────────────────────────────────────────
    # 2. State-level nonfarm employment
    # ──────────────────────────────────────────────
    print("\n--- State nonfarm employment ---")
    for st in STATES:
        sid = f"{st}NA"  # Total nonfarm
        db_id = f"state_{st.lower()}_nonfarm"
        n = fetch_and_store(sid, db_id, f"{STATE_NAMES[st]} Nonfarm Employment",
                           "Labor", "state", "Thousands", "monthly", "fred", state=st)
        if n:
            total_new += 1
            total_points += n
        time.sleep(0.3)

    # ──────────────────────────────────────────────
    # 3. National sector employment
    # ──────────────────────────────────────────────
    print("\n--- National sector employment ---")
    sectors = {
        "CES0500000001": ("Total Private", "all private sector"),
        "CES1000000001": ("Mining & Logging", "mining and logging"),
        "CES2000000001": ("Construction", "construction"),
        "CES3000000001": ("Manufacturing", "manufacturing"),
        "CES4000000001": ("Trade, Transport, Utilities", "trade, transportation, utilities"),
        "CES5000000001": ("Information", "information sector"),
        "CES5500000001": ("Financial Activities", "finance, insurance, real estate"),
        "CES6000000001": ("Professional & Business", "professional and business services"),
        "CES6500000001": ("Education & Health", "education and health services"),
        "CES7000000001": ("Leisure & Hospitality", "leisure and hospitality"),
        "CES8000000001": ("Other Services", "other services"),
        "CES9000000001": ("Government", "government"),
    }
    for sid, (name, desc) in sectors.items():
        db_id = f"sector_{sid.lower()}"
        n = fetch_and_store(sid, db_id, f"{name} Employment",
                           "Labor", "national", "Thousands", "monthly", "fred",
                           description=f"National {desc} employment")
        if n:
            total_new += 1
            total_points += n
            print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ──────────────────────────────────────────────
    # 4. National financial conditions
    # ──────────────────────────────────────────────
    print("\n--- Financial conditions ---")
    financial = {
        "NFCI": ("Chicago Fed Financial Conditions", "Index", "weekly"),
        "ANFCI": ("Adjusted Financial Conditions", "Index", "weekly"),
        "STLFSI2": ("St. Louis Fed Financial Stress", "Index", "weekly"),
        "TEDRATE": ("TED Spread", "%", "daily"),
        "DPRIME": ("Bank Prime Rate", "%", "daily"),
        "FEDFUNDS": ("Federal Funds Rate (daily)", "%", "daily"),
        "AAA": ("Moody's AAA Corporate Yield", "%", "daily"),
        "BAA": ("Moody's BAA Corporate Yield", "%", "daily"),
        "T10Y3M": ("10Y-3M Spread", "%", "daily"),
        "DCOILWTICO": ("WTI Crude Oil Price", "$/barrel", "daily"),
        "DCOILBRENTEU": ("Brent Crude Oil Price", "$/barrel", "daily"),
        "GOLDAMGBD228NLBM": ("Gold Price (London)", "$/oz", "daily"),
        "DEXUSEU": ("USD/EUR Exchange Rate", "Rate", "daily"),
        "DEXJPUS": ("JPY/USD Exchange Rate", "Rate", "daily"),
        "DEXCHUS": ("CNY/USD Exchange Rate", "Rate", "daily"),
        "DTWEXBGS": ("Trade-Weighted Dollar Index", "Index", "daily"),
        "WILL5000IND": ("Wilshire 5000", "Index", "daily"),
        "NASDAQCOM": ("NASDAQ Composite", "Index", "daily"),
        "DJIA": ("Dow Jones Industrial Average", "Index", "daily"),
    }
    for sid, (name, unit, freq) in financial.items():
        db_id = f"fin_{sid.lower()}"
        n = fetch_and_store(sid, db_id, name, "Markets", "national", unit, freq, "fred")
        if n:
            total_new += 1
            total_points += n
            print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ──────────────────────────────────────────────
    # 5. Consumer/retail data
    # ──────────────────────────────────────────────
    print("\n--- Consumer data ---")
    consumer = {
        "PCE": ("Personal Consumption Expenditures", "Billions $", "monthly"),
        "PCEDG": ("PCE Durable Goods", "Billions $", "monthly"),
        "PCEND": ("PCE Nondurable Goods", "Billions $", "monthly"),
        "PCES": ("PCE Services", "Billions $", "monthly"),
        "UMCSENT": ("Consumer Sentiment (UMich)", "Index", "monthly"),
        "CSCICP03USM665S": ("Consumer Confidence (OECD)", "Index", "monthly"),
        "MRTSSM44X72USS": ("Retail Sales ex Auto", "Millions $", "monthly"),
        "RRSFS": ("Real Retail Sales", "Millions $", "monthly"),
        "TOTALSA": ("Total Vehicle Sales", "Millions", "monthly"),
        "LTRSA": ("Light Truck Sales", "Millions", "monthly"),
        "REVOLSL": ("Revolving Consumer Credit", "Billions $", "monthly"),
        "NONREVSL": ("Non-Revolving Consumer Credit", "Billions $", "monthly"),
    }
    for sid, (name, unit, freq) in consumer.items():
        db_id = f"consumer_{sid.lower()}"
        n = fetch_and_store(sid, db_id, name, "Consumer", "national", unit, freq, "fred")
        if n:
            total_new += 1
            total_points += n
            print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ──────────────────────────────────────────────
    # 6. Housing / real estate
    # ──────────────────────────────────────────────
    print("\n--- Housing data ---")
    housing = {
        "HOUST1F": ("Single-Family Housing Starts", "Thousands", "monthly"),
        "HOUST5F": ("5+ Unit Housing Starts", "Thousands", "monthly"),
        "PERMIT1": ("Single-Family Building Permits", "Thousands", "monthly"),
        "MSACSR": ("Months Supply of New Houses", "Months", "monthly"),
        "HSN1F": ("New Home Sales", "Thousands", "monthly"),
        "EXHOSLUSM495S": ("Existing Home Sales", "Millions", "monthly"),
        "MSPNHSUS": ("Median New Home Price", "$", "monthly"),
        "MSPUS": ("Median Existing Home Price", "$", "quarterly"),
        "ASPNHSUS": ("Average New Home Price", "$", "monthly"),
        "RHORUSQ156N": ("Homeownership Rate", "%", "quarterly"),
        "RRVRUSQ156N": ("Rental Vacancy Rate", "%", "quarterly"),
        "RHVRUSQ156N": ("Homeowner Vacancy Rate", "%", "quarterly"),
        "FIXHAI": ("Housing Affordability Index", "Index", "monthly"),
    }
    for sid, (name, unit, freq) in housing.items():
        db_id = f"housing_{sid.lower()}"
        n = fetch_and_store(sid, db_id, name, "Housing", "national", unit, freq, "fred")
        if n:
            total_new += 1
            total_points += n
            print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ──────────────────────────────────────────────
    # 7. Manufacturing / production
    # ──────────────────────────────────────────────
    print("\n--- Manufacturing & production ---")
    manufacturing = {
        "IPMAN": ("Manufacturing Production", "Index", "monthly"),
        "IPMANSICS": ("Manufacturing (SIC)", "Index", "monthly"),
        "DGORDER": ("Durable Goods Orders", "Millions $", "monthly"),
        "NEWORDER": ("Manufacturers New Orders", "Millions $", "monthly"),
        "AMTMNO": ("Total Manufacturing Orders", "Millions $", "monthly"),
        "AMDMNO": ("Durable Manufacturing Orders", "Millions $", "monthly"),
        "TCU": ("Capacity Utilization", "%", "monthly"),
        "MCUMFN": ("Manufacturing Capacity Util", "%", "monthly"),
        "MANEMP": ("Manufacturing Employment", "Thousands", "monthly"),
        "ISMPMI": ("ISM Manufacturing PMI", "Index", "monthly"),
        "ISMNONMPMI": ("ISM Non-Manufacturing PMI", "Index", "monthly"),
    }
    for sid, (name, unit, freq) in manufacturing.items():
        db_id = f"manuf_{sid.lower()}"
        n = fetch_and_store(sid, db_id, name, "Production", "national", unit, freq, "fred")
        if n:
            total_new += 1
            total_points += n
            print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ──────────────────────────────────────────────
    # 8. Trade data
    # ──────────────────────────────────────────────
    print("\n--- Trade data ---")
    trade = {
        "BOPGSTB": ("Trade Balance", "Millions $", "monthly"),
        "IMPGS": ("Imports of Goods & Services", "Billions $", "quarterly"),
        "EXPGS": ("Exports of Goods & Services", "Billions $", "quarterly"),
        "IMP0004": ("Imports: Consumer Goods", "Millions $", "monthly"),
        "EXP0004": ("Exports: Consumer Goods", "Millions $", "monthly"),
    }
    for sid, (name, unit, freq) in trade.items():
        db_id = f"trade_{sid.lower()}"
        n = fetch_and_store(sid, db_id, name, "Trade", "national", unit, freq, "fred")
        if n:
            total_new += 1
            total_points += n
            print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ──────────────────────────────────────────────
    # 9. Inflation breakdowns
    # ──────────────────────────────────────────────
    print("\n--- Inflation breakdowns ---")
    inflation = {
        "CPIAUCSL": ("CPI All Urban Consumers", "Index", "monthly"),
        "CPILFESL": ("Core CPI (ex Food & Energy)", "Index", "monthly"),
        "CPIENGSL": ("CPI Energy", "Index", "monthly"),
        "CPIUFDSL": ("CPI Food", "Index", "monthly"),
        "CUSR0000SAH1": ("CPI Shelter", "Index", "monthly"),
        "CUSR0000SETB01": ("CPI Gasoline", "Index", "monthly"),
        "CUSR0000SAM2": ("CPI Medical Care", "Index", "monthly"),
        "CUSR0000SAE1": ("CPI Education", "Index", "monthly"),
        "PPIFIS": ("PPI Final Demand", "Index", "monthly"),
        "PPIACO": ("PPI All Commodities", "Index", "monthly"),
        "T5YIE": ("5-Year Breakeven Inflation", "%", "daily"),
        "T10YIE": ("10-Year Breakeven Inflation", "%", "daily"),
        "MICH": ("UMich Inflation Expectations", "%", "monthly"),
    }
    for sid, (name, unit, freq) in inflation.items():
        db_id = f"inflation_{sid.lower()}"
        n = fetch_and_store(sid, db_id, name, "Prices", "national", unit, freq, "fred")
        if n:
            total_new += 1
            total_points += n
            print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # ──────────────────────────────────────────────
    # 10. Labor market deep dives
    # ──────────────────────────────────────────────
    print("\n--- Labor market detail ---")
    labor = {
        "PAYEMS": ("Total Nonfarm Payrolls", "Thousands", "monthly"),
        "USPRIV": ("Total Private Employment", "Thousands", "monthly"),
        "USGOVT": ("Government Employment", "Thousands", "monthly"),
        "CE16OV": ("Civilian Employment Level", "Thousands", "monthly"),
        "CLF16OV": ("Civilian Labor Force", "Thousands", "monthly"),
        "CIVPART": ("Labor Force Participation", "%", "monthly"),
        "EMRATIO": ("Employment-Population Ratio", "%", "monthly"),
        "LNS13327709": ("U-6 Unemployment Rate", "%", "monthly"),
        "AWHAETP": ("Avg Weekly Hours", "Hours", "monthly"),
        "CES0500000003": ("Avg Hourly Earnings", "$", "monthly"),
        "LES1252881600Q": ("Median Usual Weekly Earnings", "$", "quarterly"),
        "JTSJOR": ("Job Openings Rate", "%", "monthly"),
        "JTSHOR": ("Hires Rate", "%", "monthly"),
        "JTSLDR": ("Layoffs & Discharges Rate", "%", "monthly"),
    }
    for sid, (name, unit, freq) in labor.items():
        db_id = f"labor_{sid.lower()}"
        n = fetch_and_store(sid, db_id, name, "Labor", "national", unit, freq, "fred")
        if n:
            total_new += 1
            total_points += n
            print(f"  {name}: {n} pts")
        time.sleep(0.3)

    # Done
    stats = get_stats()
    print(f"\n{'='*60}")
    print(f"FRED Bulk Fetch Complete")
    print(f"  New series added this run: {total_new}")
    print(f"  New datapoints: {total_points}")
    print(f"  Total series in DB: {stats['total_series']}")
    print(f"  Total datapoints in DB: {stats['total_datapoints']}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
