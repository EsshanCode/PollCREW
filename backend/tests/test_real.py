import httpx
import pytest
from fastapi.testclient import TestClient

import fec
import main
from census import CensusError, districts
from ohio import STATEWIDE


class Resp:
    def __init__(self, payload, status=200):
        self.payload, self.status = payload, status

    def raise_for_status(self):
        if self.status >= 400:
            raise httpx.HTTPStatusError("x", request=httpx.Request("GET", "u"), response=None)

    def json(self):
        return self.payload


# Shape and key names verified against the live Census API for 2840 E Orange Rd, Lewis Center.
ORANGE = {
    "result": {
        "addressMatches": [
            {
                "matchedAddress": "2840 E ORANGE RD, LEWIS CENTER, OH, 43035",
                "geographies": {
                    "States": [{"NAME": "Ohio", "GEOID": "39"}],
                    "Counties": [{"NAME": "Delaware County", "GEOID": "39041"}],
                    "County Subdivisions": [{"NAME": "Orange township", "GEOID": "3904158618"}],
                    "Unified School Districts": [
                        {"NAME": "Olentangy Local School District", "GEOID": "3904676"}
                    ],
                    "2026 State Legislative Districts - Upper": [
                        {"NAME": "State Senate District 19", "BASENAME": "19"}
                    ],
                    "2026 State Legislative Districts - Lower": [
                        {"NAME": "State House District 60", "BASENAME": "60"}
                    ],
                    "120th Congressional Districts": [
                        {"NAME": "Congressional District 12", "BASENAME": "12"}
                    ],
                },
            }
        ]
    }
}


def test_districts_parses_census_layers():
    sent = {}

    def get(url, params, timeout):
        sent.update(params)
        return Resp(ORANGE)

    d = districts("2840 E Orange Rd, Lewis Center, OH 43035", get=get)
    assert sent["layers"] == "all" and sent["benchmark"] == "Public_AR_Current"
    assert d["county"] == "Delaware County" and d["county_fips"] == "39041"
    assert d["township"] == "Orange township"
    assert d["school_district"] == "Olentangy Local School District"
    assert (d["ohio_senate"], d["ohio_house"], d["us_house"]) == ("19", "60", "12")


def test_districts_rejects_outside_ohio_and_unknown():
    outside = {
        "result": {
            "addressMatches": [
                {
                    "geographies": {
                        "States": [{"NAME": "Indiana"}],
                        "Counties": [{"NAME": "Marion County", "GEOID": "18097"}],
                    }
                }
            ]
        }
    }
    with pytest.raises(CensusError, match="outside Ohio"):
        districts("x", get=lambda *a, **k: Resp(outside))
    with pytest.raises(CensusError, match="couldn't find"):
        districts("x", get=lambda *a, **k: Resp({"result": {"addressMatches": []}}))
    with pytest.raises(CensusError, match="isn't responding"):
        districts("x", get=lambda *a, **k: Resp({}, status=503))


def test_statewide_candidates_are_real_and_have_no_invented_positions():
    assert len(STATEWIDE) == 8
    for race in STATEWIDE:
        assert len(race["candidates"]) >= 2
        for c in race["candidates"]:
            assert set(c) == {"name", "party", "running_mate"}  # no positions, no money


def test_fec_attach_matches_last_and_first_name():
    money = {
        "rows": [
            {"fec_name": "BROWN, SHERROD", "receipts": 10, "disbursements": 5, "as_of": "2026-09-30"},
            {"fec_name": "HUSTED, JON A.", "receipts": 20, "disbursements": 8, "as_of": "2026-09-30"},
            {"fec_name": "BROWN, ALICE", "receipts": 1, "disbursements": 1, "as_of": "2026-09-30"},
        ],
        "page": fec.PAGE,
    }
    out = fec.attach(STATEWIDE[0]["candidates"], money)
    by_name = {c["name"]: c["money"] for c in out}
    assert by_name["Sherrod Brown"]["receipts"] == 10
    assert by_name["Jon Husted"]["receipts"] == 20
    assert by_name["Greg Levy"] is None
    assert fec.attach(STATEWIDE[0]["candidates"], None) == STATEWIDE[0]["candidates"]


def test_fec_failure_returns_none_and_success_is_cached(monkeypatch):
    fec._cache.clear()
    fec._cache.update(at=0.0, data=None)
    assert fec.senate_money(get=lambda *a, **k: Resp({}, status=500), now=100) is None
    fec._cache.clear()
    fec._cache.update(at=0.0, data=None)
    calls = []

    def ok(url, params, timeout):
        calls.append(params)
        return Resp(
            {
                "results": [
                    {
                        "candidate_name": "BROWN, SHERROD",
                        "total_receipts": 1.0,
                        "total_disbursements": 2.0,
                        "coverage_end_date": "2026-09-30T00:00:00",
                    }
                ]
            }
        )

    first = fec.senate_money(get=ok, now=200)
    again = fec.senate_money(get=ok, now=300)
    assert first == again and len(calls) == 1
    assert calls[0]["office"] == "senate" and calls[0]["state"] == "OH"
    fec._cache.clear()
    fec._cache.update(at=0.0, data=None)


def test_lookup_endpoint(monkeypatch):
    monkeypatch.setattr(main, "senate_money", lambda: None)
    client = TestClient(main.app)

    monkeypatch.setattr(main, "districts", lambda address: {**districts("x", get=lambda *a, **k: Resp(ORANGE))})
    body = client.post("/api/lookup", json={"address": "2840 E Orange Rd, Lewis Center, OH 43035"}).json()
    assert body["county"] == "delaware"
    assert body["districts"]["ohio_house"] == "60"
    assert len(body["statewide"]) == 8
    assert body["statewide"][0]["money_available"] is False

    def toledo(address):
        d = districts("x", get=lambda *a, **k: Resp(ORANGE))
        return {**d, "county": "Lucas County", "county_fips": "39095"}

    monkeypatch.setattr(main, "districts", toledo)
    body = client.post("/api/lookup", json={"address": "1 Government Center, Toledo, OH"}).json()
    assert body["county"] is None and body["districts"]["county"] == "Lucas County"

    def outside(address):
        raise CensusError("Blind Ballot covers Ohio. That address is outside Ohio.")

    monkeypatch.setattr(main, "districts", outside)
    assert client.post("/api/lookup", json={"address": "Indianapolis, IN"}).status_code == 404

    def unmatched(address):
        raise CensusError("The Census Bureau couldn't find that address.")

    monkeypatch.setattr(main, "districts", unmatched)
    body = client.post("/api/lookup", json={"address": "OH 43604"}).json()  # ZIP only, Toledo
    assert body["county"] is None and body["districts"] is None
    assert len(body["statewide"]) == 8 and "street address" in body["districts_note"]
    assert client.post("/api/lookup", json={"address": "OH 90210"}).status_code == 404


def test_local_races_from_county_lists():
    from local import LOCAL, counties_for_zip, local_races

    assert len(LOCAL) == 88
    assert sum(1 for v in LOCAL.values() if v["found"]) == 80
    assert counties_for_zip("Toledo, OH 43604") == ["Lucas"]
    assert counties_for_zip("Dublin 43017") == ["Franklin", "Delaware"]
    assert counties_for_zip("Beverly Hills 90210") == []
    # Delaware's official list: commissioner race and both of its Ohio House districts.
    full = local_races("Delaware County")
    offices = [(r["office"], r["district"]) for r in full["races"]]
    assert ("Ohio House", "60") in offices and ("Ohio House", "61") in offices
    commissioner = next(r for r in full["races"] if r["office"] == "County Commissioner")
    assert {c["name"] for c in commissioner["candidates"]} == {"Ryan Grissinger", "Renee Vaughan"}
    # With Census districts, only the voter's own legislative districts remain.
    mine = local_races("Delaware County", {"us_house": "12", "ohio_senate": "19", "ohio_house": "60"})
    kept = [(r["office"], r["district"]) for r in mine["races"]]
    assert ("Ohio House", "60") in kept and ("Ohio House", "61") not in kept
    assert ("U.S. House", "4") not in kept and mine["narrowed"]
    # Counties without a published list say so instead of guessing.
    assert local_races("Lucas County")["found"] is False
    # Real candidates carry names and parties only.
    for v in LOCAL.values():
        for r in v["races"]:
            for c in r["candidates"]:
                assert set(c) == {"name", "party"}


def test_feedback_counts_only(monkeypatch):
    client = TestClient(main.app)
    main.feedback.update(yes=0, no=0, unsure=0, notes=[])
    client.post("/api/feedback", json={"same": "no", "confusing": "What is a levy?"})
    client.post("/api/feedback", json={"same": "yes"})
    summary = client.get("/api/feedback/summary").json()
    assert summary == {"total": 2, "same": 1, "changed": 1, "unsure": 0}
    assert "What is a levy?" not in str(summary)  # notes never public
    assert client.get("/api/feedback/notes").status_code == 404
    assert client.post("/api/feedback", json={"same": "maybe"}).status_code == 422
    main.feedback.update(yes=0, no=0, unsure=0, notes=[])
