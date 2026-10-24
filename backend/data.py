import math
import random

SKILLS = {
    "check_in": "Voter check-in and accurate data entry",
    "accessibility": "Accessible assistance and patient communication",
    "equipment": "Troubleshooting tablets and printers",
    "leadership": "Team coordination and shift leadership",
    "spanish": "Spanish language assistance",
}
JURISDICTIONS = [
    {
        "id": "wake-nc",
        "name": "Wake County",
        "state": "North Carolina",
        "code": "NC",
        "lat": 35.7796,
        "lon": -78.6382,
        "arrival": 74,
        "arrival_offsets": [-10, -4, 4, 12],
        "surge_budget": 6,
    },
    {
        "id": "dane-wi",
        "name": "Dane County",
        "state": "Wisconsin",
        "code": "WI",
        "lat": 43.0731,
        "lon": -89.4012,
        "arrival": 66,
        "surge_budget": 6,
    },
    {
        "id": "maricopa-az",
        "name": "Maricopa County",
        "state": "Arizona",
        "code": "AZ",
        "lat": 33.4484,
        "lon": -112.074,
        "arrival": 86,
        "surge_budget": 6,
    },
]


FIRST_NAMES = [
    "Alex",
    "Jordan",
    "Morgan",
    "Sam",
    "Taylor",
    "Casey",
    "Avery",
    "Riley",
    "Jamie",
    "Drew",
]
LAST_NAMES = ["Rivera", "Chen", "Patel", "Brooks", "Reed"]


def standard_requirements(code="", index=0):
    return [
        {
            "role": "Check-in",
            "desired": 5 if code == "AZ" else 4,
            "minimum": 2,
            "skills": ["check_in"],
            "training": True,
        },
        {
            "role": "Voter support",
            "desired": 1 if code == "WI" else 2,
            "minimum": 1,
            "skills": (
                ["accessibility", "spanish"]
                if code == "AZ" and index == 0
                else ["accessibility"]
            ),
            "training": True,
        },
        {
            "role": "Site lead",
            "desired": 1,
            "minimum": 1,
            "skills": ["leadership", "equipment"],
            "training": True,
        },
    ]


def synthetic_workers(code, lat, lon, rng, count=50, spread=(0.065, 0.08)):
    workers = []
    for i in range(count):
        skills = ["check_in", "accessibility"]
        if i % 3 == 0:
            skills += ["leadership", "equipment"]
        if i % 4 == 0:
            skills += ["spanish"]
        if i % 7 == 0:
            skills = ["accessibility"]
        workers.append(
            {
                "id": f"{code}-{i + 1:03}",
                "name": FIRST_NAMES[i % 10] + " " + LAST_NAMES[(i // 10) % 5],
                "lat": lat + rng.uniform(-spread[0], spread[0]),
                "lon": lon + rng.uniform(-spread[1], spread[1]),
                "confirmed_skills": skills,
                "rejected_skills": [],
                "experience": "",
                "trained": i % 13 != 0,
                "available_start": 6,
                "available_end": 20 if i % 17 else 12,
                "max_travel_km": 30,
                "attendance_probability": 0.92,
                "cancelled": False,
            }
        )
    return workers


def jurisdiction_state(jurisdiction, locations, workers, surge_budget):
    return {
        "jurisdiction": jurisdiction,
        "locations": locations,
        "workers": workers,
        "surge_budget": surge_budget,
        "plan": None,
        "baseline": None,
        "curve": None,
        "before": None,
        "impact": None,
        "revision": 0,
        "events": [],
    }


def dataset(seed=2026):
    rng = random.Random(seed)
    result = {}
    for j in JURISDICTIONS:
        locations = []
        for i, name in enumerate(
            [
                "Central Library",
                "North Community Center",
                "East Learning Center",
                "West Recreation Hall",
            ]
        ):
            locations.append(
                {
                    "id": f"{j['id']}-L{i}",
                    "name": name,
                    "lat": j["lat"] + [0, 0.055, -0.025, -0.05][i],
                    "lon": j["lon"] + [0, -0.035, 0.065, -0.06][i],
                    "precincts": [
                        f"{j['code']}-{i * 2 + 1:03}",
                        f"{j['code']}-{i * 2 + 2:03}",
                    ],
                    "arrival_per_hour": j["arrival"]
                    + j.get("arrival_offsets", [0, 3, 6, 9])[i],
                    "service_minutes": 2.5,
                    "start": 6,
                    "end": 20,
                    "requirements": standard_requirements(j["code"], i),
                }
            )
        workers = synthetic_workers(j["code"], j["lat"], j["lon"], rng)
        result[j["id"]] = jurisdiction_state(j, locations, workers, j["surge_budget"])
    return result


def distance_km(worker, location):
    a, b = math.radians(worker["lat"]), math.radians(location["lat"])
    dlat = b - a
    dlon = math.radians(location["lon"] - worker["lon"])
    h = math.sin(dlat / 2) ** 2 + math.cos(a) * math.cos(b) * math.sin(dlon / 2) ** 2
    return 6371 * 2 * math.asin(min(1, math.sqrt(h)))
