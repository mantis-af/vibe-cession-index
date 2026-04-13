"""
Canonical tag taxonomy for Undercurrent economic data.

Hierarchy: domain > category > subcategory
Each series gets one primary tag and optional additional tags.
Keywords are extracted from series names for free-text search.
"""

# ─── Domain → Category definitions ───
# Each domain groups economically related categories.
# Subcategories are added per-series based on scope (national, state, metro, etc.)

TAXONOMY = {
    "labor": {
        "label": "Labor Market",
        "categories": {
            "unemployment": "Unemployment rates and related measures",
            "employment": "Employment levels, nonfarm payrolls, sector employment",
            "participation": "Labor force participation, employment-population ratio",
            "wages": "Hourly earnings, weekly wages, compensation",
            "claims": "Initial and continued unemployment claims",
            "hours": "Average weekly hours worked",
            "jolts": "Job openings, hires, quits, layoffs (JOLTS)",
            "wages-metro": "Metro-level average weekly wages (QCEW)",
        },
    },
    "housing": {
        "label": "Housing & Real Estate",
        "categories": {
            "inventory": "Active listings, months of supply",
            "prices": "Home values, price indices (Case-Shiller, FHFA, Zillow)",
            "starts": "Housing starts, building permits",
            "sales": "New and existing home sales",
            "affordability": "Housing affordability indices, cost burden",
            "rental": "Rent prices, rent indices (Zillow ZORI, Apartment List, HUD FMR)",
            "vacancy": "Rental and homeowner vacancy rates",
            "mortgage": "Mortgage rates, applications",
            "construction": "Construction spending, workers",
        },
    },
    "prices": {
        "label": "Prices & Inflation",
        "categories": {
            "cpi": "Consumer Price Index and components",
            "ppi": "Producer Price Index",
            "inflation-expectations": "Survey-based and market-implied inflation expectations",
            "breakeven": "Treasury breakeven inflation rates",
            "food": "Food prices (CPI food, PPI farm/processed)",
            "energy": "Energy prices (CPI energy, gasoline, electricity, utilities)",
            "medical": "Healthcare costs (CPI medical, PPI hospitals)",
            "shelter": "Housing costs (CPI shelter, rent)",
        },
    },
    "markets": {
        "label": "Financial Markets",
        "categories": {
            "equities": "Stock indices (S&P 500, NASDAQ, DJIA, Wilshire)",
            "bonds": "Corporate bond yields (AAA, BAA)",
            "spreads": "Credit spreads, TED spread, yield curve",
            "forex": "Exchange rates (USD vs major currencies)",
            "volatility": "VIX and implied volatility",
            "crypto": "Bitcoin, Ethereum, digital assets",
        },
    },
    "consumer": {
        "label": "Consumer Activity",
        "categories": {
            "spending": "Personal consumption expenditures, retail sales",
            "credit": "Consumer credit (revolving, non-revolving, delinquencies)",
            "sentiment": "Consumer confidence and sentiment surveys",
            "savings": "Personal savings rate",
            "vehicles": "Auto and light truck sales",
            "debt-burden": "Debt service ratios, financial obligations",
            "hardship": "Financial hardship, difficulty paying bills, food insecurity",
            "fragility": "Debt burden, savings cushion, financial obligations",
        },
    },
    "production": {
        "label": "Production & Manufacturing",
        "categories": {
            "manufacturing": "Manufacturing output, industrial production",
            "capacity": "Capacity utilization",
            "orders": "Durable goods orders, factory orders",
            "pmi": "Purchasing managers indices (ISM)",
            "productivity": "Labor productivity, unit labor costs",
        },
    },
    "trade": {
        "label": "International Trade",
        "categories": {
            "balance": "Trade balance, current account",
            "imports": "Total and by-country imports",
            "exports": "Total and by-country exports",
            "bilateral": "Bilateral trade with specific countries",
        },
    },
    "fiscal": {
        "label": "Government & Fiscal",
        "categories": {
            "debt": "Federal debt, debt-to-GDP ratio",
            "deficit": "Federal surplus/deficit",
            "spending": "Government expenditures, transfers",
            "revenue": "Federal receipts, tax revenue",
        },
    },
    "monetary": {
        "label": "Monetary Policy & Conditions",
        "categories": {
            "rates": "Fed funds rate, policy rates, Treasury yields",
            "money-supply": "M1, M2, monetary base",
            "fed-balance-sheet": "Fed total assets, Treasury holdings, MBS",
            "financial-conditions": "NFCI, financial stress indices",
        },
    },
    "energy": {
        "label": "Energy",
        "categories": {
            "oil": "Crude oil prices (WTI, Brent)",
            "gas": "Natural gas, gasoline, diesel prices",
            "electricity": "Electricity prices, generation",
            "commodities": "Energy commodity indices",
        },
    },
    "business": {
        "label": "Business Activity",
        "categories": {
            "formation": "New business applications, high-propensity apps",
            "inventories": "Business inventories (retail, manufacturing, wholesale)",
            "profits": "Corporate profits, national income",
            "surveys": "Regional Fed surveys, NFIB small business",
            "construction": "Construction spending, workers",
            "local": "Local business openings/closings, small business street-level health",
        },
    },
    "index": {
        "label": "Undercurrent Index",
        "categories": {
            "behavioral": "Behavioral composite index (alt data)",
            "official": "Official benchmark index (government data)",
            "gap": "Sentiment gap (behavioral - official)",
            "channel": "Channel sub-indices (labor demand, cost of living, etc.)",
            "signals": "Individual signal z-scores",
        },
    },
    "demographics": {
        "label": "Demographics & Social",
        "categories": {
            "population": "Population, working age, migration",
            "inequality": "Gini coefficient, poverty rate, income distribution",
            "education": "Student loans, tuition costs",
            "healthcare": "Healthcare employment, spending, insurance costs",
            "social": "SNAP, transfer payments",
            "safety-net": "SNAP enrollment, transfer payments, social services",
            "mobility": "Migration intent, relocation patterns, transit ridership",
        },
    },
}


def get_all_tags() -> list[dict]:
    """Generate the flat tag list from the hierarchy."""
    tags = []
    sort = 0
    for domain, dspec in TAXONOMY.items():
        for category, description in dspec["categories"].items():
            slug = f"{domain}.{category}"
            tags.append({
                "slug": slug,
                "domain": domain,
                "category": category,
                "subcategory": None,
                "label": f"{dspec['label']}: {category.replace('-', ' ').title()}",
                "description": description,
                "sort_order": sort,
            })
            sort += 1
            # Add scope subcategories
            for sub in ["national", "state", "metro", "international", "regional", "sector"]:
                tags.append({
                    "slug": f"{domain}.{category}.{sub}",
                    "domain": domain,
                    "category": category,
                    "subcategory": sub,
                    "label": f"{dspec['label']}: {category.replace('-', ' ').title()} ({sub})",
                    "description": f"{description} — {sub} level",
                    "sort_order": sort,
                })
                sort += 1
    return tags


# ─── Mapping rules: old flat category → new domain.category ───
# Used to migrate existing series

CATEGORY_MAP: dict[str, str] = {
    # Old category → new domain.category
    "Labor": "labor.employment",
    "Housing": "housing.prices",
    "Income": "labor.wages",
    "GDP": "production.productivity",
    "Prices": "prices.cpi",
    "Markets": "markets.equities",
    "Commodities": "energy.commodities",
    "Consumer": "consumer.spending",
    "Business": "business.formation",
    "Rates": "monetary.rates",
    "Macro": "prices.cpi",
    "Production": "production.manufacturing",
    "Monetary": "monetary.money-supply",
    "Banking": "monetary.financial-conditions",
    "Surveys": "business.surveys",
    "Energy": "energy.oil",
    "Fiscal": "fiscal.debt",
    "Education": "demographics.education",
    "Inequality": "demographics.inequality",
    "Leading": "business.surveys",
    "Trade": "trade.balance",
    "Transportation": "trade.imports",
    "Technology": "business.formation",
    "Agriculture": "prices.food",
    "Crypto": "markets.crypto",
    "Demographics": "demographics.population",
    "Logistics": "trade.imports",
    "Other": "consumer.spending",
    "Social": "demographics.social",
    "Healthcare": "demographics.healthcare",
    "Index": "index.behavioral",
    "Signals": "index.signals",
}


def classify_series(series_id: str, name: str, old_category: str, scope: str,
                     unit: str = "", frequency: str = "") -> tuple[str, list[str]]:
    """Determine the primary tag and additional keywords for a series.

    Returns (primary_tag_slug, [keywords])
    """
    name_lower = name.lower()
    sid_lower = series_id.lower()

    # ─── Smart classification based on name/id patterns ───

    # Index series
    if "behavioral index" in name_lower or sid_lower.endswith("_index"):
        primary = "index.behavioral"
    elif "official index" in name_lower or sid_lower.endswith("_official"):
        primary = "index.official"
    elif "sentiment gap" in name_lower or sid_lower.endswith("_gap"):
        primary = "index.gap"
    elif "z-score" in name_lower or "_sig_" in sid_lower:
        primary = "index.signals"

    # Labor
    elif "unemployment" in name_lower and "claim" not in name_lower:
        primary = "labor.unemployment"
    elif "nonfarm" in name_lower or "employment" in name_lower:
        primary = "labor.employment"
    elif "claim" in name_lower:
        primary = "labor.claims"
    elif "participation" in name_lower:
        primary = "labor.participation"
    elif "hourly earn" in name_lower or "weekly earn" in name_lower or "wage" in name_lower:
        primary = "labor.wages"
    elif "hours" in name_lower and "weekly" in name_lower:
        primary = "labor.hours"
    elif "job opening" in name_lower or "quit rate" in name_lower or "hire" in name_lower or "jolts" in name_lower:
        primary = "labor.jolts"

    # Housing
    elif "house price" in name_lower or "home value" in name_lower or "zhvi" in name_lower or "case-shiller" in name_lower or "fhfa" in name_lower:
        primary = "housing.prices"
    elif "housing start" in name_lower:
        primary = "housing.starts"
    elif "building permit" in name_lower:
        primary = "housing.starts"
    elif "home sales" in name_lower:
        primary = "housing.sales"
    elif "inventory" in name_lower and "hous" in name_lower:
        primary = "housing.inventory"
    elif "days on market" in name_lower:
        primary = "housing.inventory"
    elif "price drop" in name_lower:
        primary = "housing.inventory"
    elif "affordab" in name_lower:
        primary = "housing.affordability"
    elif "vacancy" in name_lower:
        primary = "housing.vacancy"
    elif "mortgage" in name_lower:
        primary = "housing.mortgage"
    elif "construction" in name_lower:
        primary = "housing.construction"

    # Prices
    elif "cpi" in name_lower and "shelter" in name_lower:
        primary = "prices.shelter"
    elif "cpi" in name_lower and ("food" in name_lower or "grocery" in name_lower):
        primary = "prices.food"
    elif "cpi" in name_lower and ("energy" in name_lower or "gas" in name_lower or "electric" in name_lower):
        primary = "prices.energy"
    elif "cpi" in name_lower and "medical" in name_lower:
        primary = "prices.medical"
    elif "cpi" in name_lower or "consumer price" in name_lower:
        primary = "prices.cpi"
    elif "ppi" in name_lower:
        primary = "prices.ppi"
    elif "breakeven" in name_lower:
        primary = "prices.breakeven"
    elif "inflation expect" in name_lower:
        primary = "prices.inflation-expectations"

    # Markets
    elif "s&p" in name_lower or "nasdaq" in name_lower or "dow jones" in name_lower or "wilshire" in name_lower:
        primary = "markets.equities"
    elif "bitcoin" in name_lower or "ethereum" in name_lower:
        primary = "markets.crypto"
    elif "exchange rate" in name_lower or "usd/" in name_lower or "/usd" in name_lower:
        primary = "markets.forex"
    elif "vix" in name_lower or "volatil" in name_lower:
        primary = "markets.volatility"
    elif "spread" in name_lower or "ted" in name_lower:
        primary = "markets.spreads"
    elif "yield" in name_lower and "treasury" in name_lower:
        primary = "monetary.rates"
    elif "corporate" in name_lower and "yield" in name_lower:
        primary = "markets.bonds"

    # Consumer
    elif "sentiment" in name_lower or "confidence" in name_lower:
        primary = "consumer.sentiment"
    elif "savings rate" in name_lower:
        primary = "consumer.savings"
    elif "vehicle sale" in name_lower or "auto" in name_lower:
        primary = "consumer.vehicles"
    elif "consumer credit" in name_lower or "revolving" in name_lower or "non-revolving" in name_lower:
        primary = "consumer.credit"
    elif "debt service" in name_lower or "financial obligation" in name_lower:
        primary = "consumer.debt-burden"
    elif "retail" in name_lower or "pce" in name_lower or "consumption" in name_lower:
        primary = "consumer.spending"

    # Energy / Commodities
    elif "crude oil" in name_lower or "wti" in name_lower or "brent" in name_lower:
        primary = "energy.oil"
    elif "natural gas" in name_lower or "henry hub" in name_lower:
        primary = "energy.gas"
    elif "diesel" in name_lower or "gasoline" in name_lower or "propane" in name_lower or "fuel" in name_lower:
        primary = "energy.gas"
    elif "electric" in name_lower and "price" in name_lower:
        primary = "energy.electricity"
    elif any(c in name_lower for c in ["gold", "copper", "aluminum", "nickel", "zinc", "iron", "platinum", "palladium"]):
        primary = "energy.commodities"
    elif any(c in name_lower for c in ["corn", "wheat", "soybean", "coffee", "cocoa", "sugar", "rice", "barley", "cotton"]):
        primary = "prices.food"

    # Business
    elif "business app" in name_lower or "new business" in name_lower:
        primary = "business.formation"
    elif "inventor" in name_lower and "business" not in name_lower:
        primary = "business.inventories"
    elif "corporate profit" in name_lower or "national income" in name_lower:
        primary = "business.profits"
    elif "small business" in name_lower or "nfib" in name_lower:
        primary = "business.surveys"

    # Production
    elif "manufacturing" in name_lower or "industrial prod" in name_lower:
        primary = "production.manufacturing"
    elif "capacity" in name_lower:
        primary = "production.capacity"
    elif "durable good" in name_lower or "order" in name_lower:
        primary = "production.orders"
    elif "ism" in name_lower or "pmi" in name_lower:
        primary = "production.pmi"
    elif "productiv" in name_lower or "unit labor cost" in name_lower:
        primary = "production.productivity"

    # Trade
    elif "trade balance" in name_lower:
        primary = "trade.balance"
    elif "import" in name_lower:
        primary = "trade.imports"
    elif "export" in name_lower:
        primary = "trade.exports"

    # Fiscal
    elif "federal debt" in name_lower:
        primary = "fiscal.debt"
    elif "deficit" in name_lower or "surplus" in name_lower:
        primary = "fiscal.deficit"
    elif "receipt" in name_lower or "revenue" in name_lower:
        primary = "fiscal.revenue"
    elif "expenditure" in name_lower or "transfer" in name_lower:
        primary = "fiscal.spending"

    # Monetary
    elif "fed fund" in name_lower or "policy rate" in name_lower:
        primary = "monetary.rates"
    elif "m1" in name_lower or "m2" in name_lower or "money" in name_lower or "monetary base" in name_lower:
        primary = "monetary.money-supply"
    elif "fed" in name_lower and ("asset" in name_lower or "holding" in name_lower or "reserve" in name_lower):
        primary = "monetary.fed-balance-sheet"
    elif "financial condition" in name_lower or "financial stress" in name_lower:
        primary = "monetary.financial-conditions"

    # Demographics
    elif "population" in name_lower:
        primary = "demographics.population"
    elif "gini" in name_lower or "poverty" in name_lower or "median" in name_lower and "income" in name_lower:
        primary = "demographics.inequality"
    elif "student loan" in name_lower or "tuition" in name_lower:
        primary = "demographics.education"
    elif "healthcare" in name_lower or "hospital" in name_lower or "nursing" in name_lower or "ambulatory" in name_lower:
        primary = "demographics.healthcare"
    elif "snap" in name_lower:
        primary = "demographics.social"

    # Search anxiety / AI signals
    elif "search anxiety" in name_lower:
        primary = "consumer.sentiment"
    elif "ai job" in name_lower or "ai ratio" in name_lower:
        primary = "labor.employment"

    # Rental
    elif "rent" in name_lower or "zori" in name_lower or "fmr" in name_lower:
        primary = "housing.rental"
    # Hardship
    elif "hardship" in name_lower or "difficulty" in name_lower or "pulse" in name_lower:
        primary = "consumer.hardship"
    # Safety net
    elif "snap" in name_lower or "food stamp" in name_lower:
        primary = "demographics.safety-net"
    # Transit
    elif "transit" in name_lower or "ridership" in name_lower:
        primary = "demographics.mobility"
    # Local business
    elif "yelp" in name_lower or "local business" in name_lower:
        primary = "business.local"
    # QCEW wages
    elif "weekly wage" in name_lower or "qcew" in name_lower:
        primary = "labor.wages-metro"
    # Migration
    elif "migration" in name_lower or "moving" in name_lower:
        primary = "demographics.mobility"
    # Survival
    elif "survival" in name_lower or "sell plasma" in name_lower or "food bank" in name_lower:
        primary = "consumer.hardship"
    # Financial fragility
    elif "fragil" in name_lower or "debt service" in name_lower or "financial obligation" in name_lower:
        primary = "consumer.fragility"

    # Fallback
    else:
        primary = CATEGORY_MAP.get(old_category, "consumer.spending")

    # Add scope subcategory
    if scope in ("state", "metro", "international", "regional", "sector"):
        primary = f"{primary}.{scope}"

    # Extract keywords from name
    stop_words = {"the", "of", "and", "in", "for", "a", "an", "to", "is", "by", "from", "at", "on", "sa", "nsa", "all"}
    words = name.lower().replace(",", "").replace("(", "").replace(")", "").replace("—", " ").replace("-", " ").split()
    keywords = [w for w in words if len(w) > 2 and w not in stop_words]

    return primary, keywords
