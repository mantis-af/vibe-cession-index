"""Metro definitions and data source mappings."""

from dataclasses import dataclass
from pathlib import Path

OUTPUT_DIR = Path(__file__).parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

PYTHON = Path(__file__).parent / ".venv" / "bin" / "python"


@dataclass
class Metro:
    id: str
    name: str
    state: str
    state_fips: str
    # Google Trends DMA code (Designated Market Area)
    google_dma: str
    # BLS LAUS area code for metro
    bls_area_code: str
    # FRED series ID for state initial claims (state-level, mapped to metro)
    fred_claims_series: str
    population: int


# 20 metros with data source mappings
METROS: list[Metro] = [
    Metro("nyc", "New York", "NY", "36", "501", "LAUMT363562000000003", "NYICLAIMS", 8_336_817),
    Metro("lax", "Los Angeles", "CA", "06", "803", "LAUMT063108000000003", "CAICLAIMS", 3_979_576),
    Metro("chi", "Chicago", "IL", "17", "602", "LAUMT171698000000003", "ILICLAIMS", 2_693_976),
    Metro("hou", "Houston", "TX", "48", "618", "LAUMT482642000000003", "TXICLAIMS", 2_304_580),
    Metro("phx", "Phoenix", "AZ", "04", "753", "LAUMT043806000000003", "AZICLAIMS", 1_608_139),
    Metro("phl", "Philadelphia", "PA", "42", "504", "LAUMT423798000000003", "PAICLAIMS", 1_603_797),
    Metro("sat", "San Antonio", "TX", "48", "641", "LAUMT484170000000003", "TXICLAIMS", 1_547_253),
    Metro("sdg", "San Diego", "CA", "06", "825", "LAUMT064174000000003", "CAICLAIMS", 1_423_851),
    Metro("dal", "Dallas", "TX", "48", "623", "LAUMT481910000000003", "TXICLAIMS", 1_304_379),
    Metro("sjc", "San Jose", "CA", "06", "807", "LAUMT064186000000003", "CAICLAIMS", 1_013_240),
    Metro("aus", "Austin", "TX", "48", "635", "LAUMT480122000000003", "TXICLAIMS", 978_908),
    Metro("jax", "Jacksonville", "FL", "12", "561", "LAUMT122700000000003", "FLICLAIMS", 949_611),
    Metro("sfo", "San Francisco", "CA", "06", "807", "LAUMT064186000000003", "CAICLAIMS", 873_965),
    Metro("cmh", "Columbus", "OH", "39", "535", "LAUMT391840000000003", "OHICLAIMS", 905_748),
    Metro("clt", "Charlotte", "NC", "37", "517", "LAUMT371674000000003", "NCICLAIMS", 874_579),
    Metro("ind", "Indianapolis", "IN", "18", "527", "LAUMT182634000000003", "INICLAIMS", 887_642),
    Metro("sea", "Seattle", "WA", "53", "819", "LAUMT534266000000003", "WAICLAIMS", 737_015),
    Metro("den", "Denver", "CO", "08", "751", "LAUMT081974000000003", "COICLAIMS", 715_522),
    Metro("dca", "Washington", "DC", "11", "511", "LAUMT114790000000003", "DCICLAIMS", 689_545),
    Metro("bna", "Nashville", "TN", "47", "659", "LAUMT473498000000003", "TNICLAIMS", 689_447),
]

METRO_BY_ID = {m.id: m for m in METROS}

# Google Trends search terms
DISTRESS_TERMS = [
    "unemployment benefits",
    "food stamps",
    "payday loan",
    "debt relief",
    "side hustle",
]

ASPIRATION_TERMS = [
    "new job",
    "salary negotiation",
    "starting a business",
    "investment account",
    "buy a house",
]
