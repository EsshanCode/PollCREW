import os
import random
import re
import httpx
from data import jurisdiction_state, standard_requirements, synthetic_workers

VOTERINFO_URL = "https://www.googleapis.com/civicinfo/v2/voterinfo"
ASSUMED_ARRIVALS = [64, 70, 78, 86, 72, 82, 68, 90]
MAX_SITES = 8


class PollingError(ValueError):
    pass


def configured():
    return bool(os.getenv("GOOGLE_CIVIC_API_KEY"))


def _error_detail(response):
    try:
        return response.json()["error"]["message"]
    except Exception:
        return f"HTTP {response.status_code}"


def _coordinate(value):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math_finite(number) else None


def math_finite(number):
    return number == number and abs(number) != float("inf")


def _street(address):
    parts = [address.get("line1"), address.get("line2"), address.get("line3")]
    street = ", ".join(p for p in parts if p)
    tail = " ".join(p for p in [address.get("state"), address.get("zip")] if p)
    return ", ".join(p for p in [street, address.get("city"), tail] if p)


def _title(text):
    return " ".join(w.capitalize() if w.isupper() else w for w in text.split())


def fetch_polling_places(addresses, election_id=None, get=None):
    key = os.getenv("GOOGLE_CIVIC_API_KEY")
    if not key:
        raise PollingError(
            "Set GOOGLE_CIVIC_API_KEY in the backend terminal, then restart the backend."
        )
    get = get or httpx.get
    places = {}
    lookups = []
    for address in addresses:
        params = {"address": address, "key": key}
        if election_id:
            params["electionId"] = election_id
        try:
            response = get(VOTERINFO_URL, params=params, timeout=15)
        except httpx.HTTPError:
            lookups.append(
                {"address": address, "status": "error", "detail": "Network error"}
            )
            continue
        if response.status_code != 200:
            lookups.append(
                {
                    "address": address,
                    "status": "error",
                    "detail": _error_detail(response),
                }
            )
            continue
        body = response.json()
        found = skipped = 0
        for location in body.get("pollingLocations", []):
            address_fields = location.get("address", {})
            lat = _coordinate(location.get("latitude"))
            lon = _coordinate(location.get("longitude"))
            if lat is None or lon is None:
                skipped += 1
                continue
            key_fields = (
                re.sub(
                    r"\W+", " ", (address_fields.get("line1") or "").lower()
                ).strip(),
                address_fields.get("zip", ""),
            )
            if key_fields not in places:
                sources = location.get("sources", [])
                places[key_fields] = {
                    "name": _title(
                        address_fields.get("locationName")
                        or address_fields.get("line1")
                        or "Polling location"
                    ),
                    "address": _street(address_fields),
                    "lat": lat,
                    "lon": lon,
                    "polling_hours": location.get("pollingHours", ""),
                    "notes": location.get("notes", ""),
                    "official": any(s.get("official") for s in sources),
                    "sources": sorted({s.get("name", "") for s in sources} - {""}),
                    "matched_addresses": [],
                }
            places[key_fields]["matched_addresses"].append(address)
            found += 1
        lookups.append(
            {
                "address": address,
                "status": "found" if found else "none",
                "found": found,
                "skipped_without_coordinates": skipped,
                "election": body.get("election", {}).get("name", ""),
                "detail": (
                    ""
                    if found
                    else "No polling place with coordinates returned for this address."
                ),
            }
        )
    return list(places.values()), lookups


def build_jurisdiction(places, name, state, code, seed=2026):
    if not places:
        raise PollingError(
            "No polling places were found. Try residential addresses inside one county, close to Election Day."
        )
    sites = places[:MAX_SITES]
    lat = sum(p["lat"] for p in sites) / len(sites)
    lon = sum(p["lon"] for p in sites) / len(sites)
    slug = re.sub(r"[^a-z0-9]+", "-", f"{name}-{code}".lower()).strip("-")
    jid = f"live-{slug}"
    jurisdiction = {
        "id": jid,
        "name": name,
        "state": state,
        "code": code.upper(),
        "lat": lat,
        "lon": lon,
        "source": "Google Civic Information API · Voting Information Project",
        "real_locations": True,
    }
    locations = []
    for i, place in enumerate(sites):
        locations.append(
            {
                "id": f"{jid}-L{i}",
                "name": place["name"],
                "lat": place["lat"],
                "lon": place["lon"],
                "precincts": [],
                "address": place["address"],
                "polling_hours": place["polling_hours"],
                "notes": place["notes"],
                "official": place["official"],
                "sources": place["sources"],
                "arrival_per_hour": ASSUMED_ARRIVALS[i % len(ASSUMED_ARRIVALS)],
                "service_minutes": 2.5,
                "start": 6,
                "end": 20,
                "requirements": standard_requirements(),
            }
        )
    lat_span = max(abs(p["lat"] - lat) for p in sites) + 0.03
    lon_span = max(abs(p["lon"] - lon) for p in sites) + 0.04
    workers = synthetic_workers(
        f"{code.upper()}L",
        lat,
        lon,
        random.Random(seed),
        count=max(50, 13 * len(sites)),
        spread=(lat_span, lon_span),
    )
    return jurisdiction_state(
        jurisdiction, locations, workers, surge_budget=max(4, len(sites) + 2)
    )
