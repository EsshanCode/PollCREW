"""Real local races for every Ohio county we could find an official list for (Nov 3, 2026).

Data: backend/data/ohio_local_2026.json, built from each county board of elections' own
published document (46-day overseas-voter notice, candidate list or sample ballot). Each
county carries its source link and revision date. Names and parties only: no positions.

ZIP lookup: backend/data/ohio_zcta_county.txt, from the Census Bureau's 2020
ZCTA-to-County Relationship File.
"""

import json
import re
from pathlib import Path

DATA = Path(__file__).parent / "data"
LOCAL = json.loads((DATA / "ohio_local_2026.json").read_text())

COUNTY_NAMES = {
    "001": "Adams", "003": "Allen", "005": "Ashland", "007": "Ashtabula", "009": "Athens",
    "011": "Auglaize", "013": "Belmont", "015": "Brown", "017": "Butler", "019": "Carroll",
    "021": "Champaign", "023": "Clark", "025": "Clermont", "027": "Clinton", "029": "Columbiana",
    "031": "Coshocton", "033": "Crawford", "035": "Cuyahoga", "037": "Darke", "039": "Defiance",
    "041": "Delaware", "043": "Erie", "045": "Fairfield", "047": "Fayette", "049": "Franklin",
    "051": "Fulton", "053": "Gallia", "055": "Geauga", "057": "Greene", "059": "Guernsey",
    "061": "Hamilton", "063": "Hancock", "065": "Hardin", "067": "Harrison", "069": "Henry",
    "071": "Highland", "073": "Hocking", "075": "Holmes", "077": "Huron", "079": "Jackson",
    "081": "Jefferson", "083": "Knox", "085": "Lake", "087": "Lawrence", "089": "Licking",
    "091": "Logan", "093": "Lorain", "095": "Lucas", "097": "Madison", "099": "Mahoning",
    "101": "Marion", "103": "Medina", "105": "Meigs", "107": "Mercer", "109": "Miami",
    "111": "Monroe", "113": "Montgomery", "115": "Morgan", "117": "Morrow", "119": "Muskingum",
    "121": "Noble", "123": "Ottawa", "125": "Paulding", "127": "Perry", "129": "Pickaway",
    "131": "Pike", "133": "Portage", "135": "Preble", "137": "Putnam", "139": "Richland",
    "141": "Ross", "143": "Sandusky", "145": "Scioto", "147": "Seneca", "149": "Shelby",
    "151": "Stark", "153": "Summit", "155": "Trumbull", "157": "Tuscarawas", "159": "Union",
    "161": "Van Wert", "163": "Vinton", "165": "Warren", "167": "Washington", "169": "Wayne",
    "171": "Williams", "173": "Wood", "175": "Wyandot",
}


def _load_zips():
    line = next(
        l for l in (DATA / "ohio_zcta_county.txt").read_text().splitlines() if l and not l.startswith("#")
    )
    return {z: fips.split(",") for z, fips in (pair.split(":") for pair in line.split())}


ZIPS = _load_zips()


def key(county_name):
    """'Van Wert County' -> 'vanwert'."""
    return re.sub(r"[^a-z]", "", (county_name or "").lower().removesuffix(" county"))


def counties_for_zip(text):
    """Counties (names) for the first Ohio ZIP in text, largest share first. [] if none."""
    match = re.search(r"\b(4[345]\d{3})\b", text or "")
    if not match:
        return []
    return [COUNTY_NAMES[f] for f in ZIPS.get(match.group(1), []) if f in COUNTY_NAMES]


def local_races(county_name, districts=None):
    """Real local races for a county. With Census districts, legislative and congressional
    races are narrowed to the voter's own districts."""
    entry = LOCAL.get(key(county_name))
    name = re.sub(r" County$", "", county_name or "")
    if not entry or not entry["found"]:
        return {"county": name, "found": False, "races": [], "narrowed": False}
    mine = {
        "congress": (districts or {}).get("us_house"),
        "senate": (districts or {}).get("ohio_senate"),
        "house": (districts or {}).get("ohio_house"),
    }
    narrowed = bool(districts)
    races = [
        r
        for r in entry["races"]
        if not (
            narrowed
            and r["kind"] in mine
            and r["district"]
            and mine[r["kind"]]
            and str(int(mine[r["kind"]])) != r["district"]
        )
    ]
    return {
        "county": name,
        "found": True,
        "source_url": entry["source_url"],
        "as_of": entry["as_of"],
        "narrowed": narrowed,
        "races": races,
    }
