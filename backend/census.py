"""Find an Ohio address's real districts with the U.S. Census Bureau Geocoder (free, no key).

Layers used (exact names returned by the Census API):
  Counties, County Subdivisions (townships), Incorporated Places (cities and villages),
  Unified / Secondary / Elementary School Districts,
  2026 State Legislative Districts - Upper / - Lower (Ohio Senate / House),
  120th Congressional Districts (the U.S. House map used in the November 2026 election).
"""

import httpx

URL = "https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress"


class CensusError(Exception):
    pass


def _first(geos, *keys):
    for key in keys:
        rows = geos.get(key) or []
        if rows:
            return rows[0]
    return None


def _find(geos, suffix):
    """Pick the first key ending with suffix (handles year prefixes like '2026 ...')."""
    for key in sorted(geos, reverse=True):
        if key.endswith(suffix) and geos[key]:
            return geos[key][0]
    return None


def districts(address, get=None):
    get = get or httpx.get
    try:
        response = get(
            URL,
            params={
                "address": address,
                "benchmark": "Public_AR_Current",
                "vintage": "Current_Current",
                "layers": "all",
                "format": "json",
            },
            timeout=12,
        )
        response.raise_for_status()
        matches = response.json()["result"]["addressMatches"]
    except (httpx.HTTPError, KeyError, ValueError) as exc:
        raise CensusError("The Census address lookup isn't responding. Try again in a moment.") from exc
    if not matches:
        raise CensusError(
            "The Census Bureau couldn't find that address. Enter your full street address, city and ZIP."
        )
    match = matches[0]
    geos = match.get("geographies", {})
    state = _first(geos, "States")
    county = _first(geos, "Counties")
    if not county or (state and state.get("NAME") != "Ohio") or not str(county.get("GEOID", "")).startswith("39"):
        raise CensusError("Blind Ballot covers Ohio. That address is outside Ohio.")
    place = _first(geos, "Incorporated Places")
    township = _first(geos, "County Subdivisions")
    school = _first(
        geos, "Unified School Districts", "Secondary School Districts", "Elementary School Districts"
    )
    upper = _find(geos, "State Legislative Districts - Upper")
    lower = _find(geos, "State Legislative Districts - Lower")
    congress = _find(geos, "Congressional Districts")

    def num(row):
        return row.get("BASENAME") if row else None

    return {
        "matched_address": match.get("matchedAddress"),
        "county": county.get("NAME"),
        "county_fips": county.get("GEOID"),
        "city": place.get("NAME") if place else None,
        "township": township.get("NAME") if township else None,
        "school_district": school.get("NAME") if school else None,
        "ohio_senate": num(upper),
        "ohio_house": num(lower),
        "us_house": num(congress),
        "source": "U.S. Census Bureau Geocoder (2026 state legislative districts, 120th Congressional districts)",
    }
