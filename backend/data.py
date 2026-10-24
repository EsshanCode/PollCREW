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


def dataset(seed=2026):
    rng = random.Random(seed)
    result = {}
    first = [
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
    last = ["Rivera", "Chen", "Patel", "Brooks", "Reed"]
    for ji, j in enumerate(JURISDICTIONS):
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
                    "requirements": [
                        {
                            "role": "Check-in",
                            "desired": 5 if j["code"] == "AZ" else 4,
                            "minimum": 2,
                            "skills": ["check_in"],
                            "training": True,
                        },
                        {
                            "role": "Voter support",
                            "desired": 1 if j["code"] == "WI" else 2,
                            "minimum": 1,
                            "skills": (
                                ["accessibility", "spanish"]
                                if j["code"] == "AZ" and i == 0
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
                    ],
                }
            )
        workers = []
        for i in range(50):
            skills = ["check_in", "accessibility"]
            if i % 3 == 0:
                skills += ["leadership", "equipment"]
            if i % 4 == 0:
                skills += ["spanish"]
            if i % 7 == 0:
                skills = ["accessibility"]
            workers.append(
                {
                    "id": f"{j['code']}-{i + 1:03}",
                    "name": first[i % 10] + " " + last[i // 10],
                    "lat": j["lat"] + rng.uniform(-0.065, 0.065),
                    "lon": j["lon"] + rng.uniform(-0.08, 0.08),
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
        result[j["id"]] = {
            "jurisdiction": j,
            "locations": locations,
            "workers": workers,
            "surge_budget": j["surge_budget"],
            "plan": None,
            "baseline": None,
            "curve": None,
            "before": None,
            "impact": None,
            "revision": 0,
            "events": [],
        }
    return result


def distance_km(worker, location):
    a, b = math.radians(worker["lat"]), math.radians(location["lat"])
    dlat = b - a
    dlon = math.radians(location["lon"] - worker["lon"])
    h = math.sin(dlat / 2) ** 2 + math.cos(a) * math.cos(b) * math.sin(dlon / 2) ** 2
    return 6371 * 2 * math.asin(min(1, math.sqrt(h)))
