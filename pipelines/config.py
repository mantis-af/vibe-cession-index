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


# 50 metros with data source mappings
METROS: list[Metro] = [
    # Original 20
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
    # New 30 metros (sorted by population)
    Metro("ftw", "Fort Worth", "TX", "48", "623", "LAUMT481910000000003", "TXICLAIMS", 958_692),
    Metro("okc", "Oklahoma City", "OK", "40", "650", "LAUMT403620000000003", "OKICLAIMS", 687_725),
    Metro("elp", "El Paso", "TX", "48", "765", "LAUMT482194000000003", "TXICLAIMS", 678_815),
    Metro("las", "Las Vegas", "NV", "32", "839", "LAUMT292982000000003", "NVICLAIMS", 660_929),
    Metro("pdx", "Portland", "OR", "41", "820", "LAUMT413890000000003", "ORICLAIMS", 652_503),
    Metro("mem", "Memphis", "TN", "47", "640", "LAUMT473298000000003", "TNICLAIMS", 633_104),
    Metro("lou", "Louisville", "KY", "21", "529", "LAUMT212694000000003", "KYICLAIMS", 628_594),
    Metro("bal", "Baltimore", "MD", "24", "512", "LAUMT240794000000003", "MDICLAIMS", 585_708),
    Metro("mil", "Milwaukee", "WI", "55", "617", "LAUMT553346000000003", "WIICLAIMS", 577_222),
    Metro("abq", "Albuquerque", "NM", "35", "790", "LAUMT350110000000003", "NMICLAIMS", 564_559),
    Metro("tuc", "Tucson", "AZ", "04", "789", "LAUMT044614000000003", "AZICLAIMS", 542_629),
    Metro("msa", "Mesa", "AZ", "04", "753", "LAUMT043806000000003", "AZICLAIMS", 504_258),
    Metro("atl", "Atlanta", "GA", "13", "524", "LAUMT130122000000003", "GAICLAIMS", 498_715),
    Metro("kcm", "Kansas City", "MO", "29", "616", "LAUMT292810000000003", "MOICLAIMS", 508_090),
    Metro("ral", "Raleigh", "NC", "37", "560", "LAUMT373898000000003", "NCICLAIMS", 474_069),
    Metro("mia", "Miami", "FL", "12", "528", "LAUMT123310000000003", "FLICLAIMS", 442_241),
    Metro("tpa", "Tampa", "FL", "12", "539", "LAUMT124530000000003", "FLICLAIMS", 384_959),
    Metro("stl", "St. Louis", "MO", "29", "609", "LAUMT294118000000003", "MOICLAIMS", 301_578),
    Metro("pit", "Pittsburgh", "PA", "42", "508", "LAUMT423862000000003", "PAICLAIMS", 302_971),
    Metro("cin", "Cincinnati", "OH", "39", "515", "LAUMT391714000000003", "OHICLAIMS", 309_317),
    Metro("orl", "Orlando", "FL", "12", "534", "LAUMT123674000000003", "FLICLAIMS", 307_573),
    Metro("cle", "Cleveland", "OH", "39", "510", "LAUMT391746000000003", "OHICLAIMS", 372_624),
    Metro("min", "Minneapolis", "MN", "27", "613", "LAUMT273346000000003", "MNICLAIMS", 429_954),
    Metro("det", "Detroit", "MI", "26", "505", "LAUMT261982000000003", "MIICLAIMS", 639_111),
    Metro("slc", "Salt Lake City", "UT", "49", "770", "LAUMT494158000000003", "UTICLAIMS", 200_831),
    Metro("bos", "Boston", "MA", "25", "506", "LAUMT250714000000003", "MAICLAIMS", 675_647),
    Metro("ric", "Richmond", "VA", "51", "556", "LAUMT514022000000003", "VAICLAIMS", 226_610),
    Metro("bir", "Birmingham", "AL", "01", "630", "LAUMT010926000000003", "ALICLAIMS", 200_733),
    Metro("har", "Hartford", "CT", "09", "533", "LAUMT093494000000003", "CTICLAIMS", 121_054),
    Metro("buf", "Buffalo", "NY", "36", "514", "LAUMT360954000000003", "NYICLAIMS", 278_349),
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

# Survival-mode search terms — people in acute financial distress
SURVIVAL_TERMS = [
    "food bank near me",
    "sell plasma",
    "rent help",
    "second job",
    "can't pay rent",
]

# Migration intent search terms — people considering relocating
MIGRATION_TERMS = [
    "moving to",
    "cost of living",
    "best places to live",
    "apartments for rent",
    "jobs hiring near me",
]
