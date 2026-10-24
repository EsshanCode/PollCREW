import pytest
from fastapi.testclient import TestClient
import polling
from engine import solve
from main import app

PLACES = {
    "1739 N High St, Columbus, OH 43210": [
        {
            "address": {
                "locationName": "OHIO UNION",
                "line1": "1739 N High St",
                "city": "Columbus",
                "state": "OH",
                "zip": "43210",
            },
            "latitude": 39.9977,
            "longitude": -83.0086,
            "pollingHours": "6:30 AM - 7:30 PM",
            "sources": [{"name": "Voting Information Project", "official": True}],
        }
    ],
    "1858 Neil Ave, Columbus, OH 43210": [
        {
            "address": {
                "locationName": "Ohio Union",
                "line1": "1739 N. High St.",
                "city": "Columbus",
                "state": "OH",
                "zip": "43210",
            },
            "latitude": 39.9977,
            "longitude": -83.0086,
        }
    ],
    "96 S Grant Ave, Columbus, OH 43215": [
        {
            "address": {
                "locationName": "Main Library",
                "line1": "96 S Grant Ave",
                "city": "Columbus",
                "state": "OH",
                "zip": "43215",
            },
            "latitude": "39.9603",
            "longitude": "-82.9909",
        },
        {"address": {"line1": "No coordinates"}},
    ],
}


class Response:
    def __init__(self, status, body):
        self.status_code = status
        self.body = body

    def json(self):
        return self.body


def fake_get(url, params, timeout):
    assert params["key"] == "test-key"
    if params["address"] not in PLACES:
        return Response(400, {"error": {"message": "Election unknown"}})
    return Response(
        200,
        {
            "election": {"name": "General Election"},
            "pollingLocations": PLACES[params["address"]],
        },
    )


@pytest.fixture(autouse=True)
def env(monkeypatch):
    monkeypatch.setenv("EMBEDDING_MODE", "offline")
    monkeypatch.setenv("GOOGLE_CIVIC_API_KEY", "test-key")


def test_fetch_dedupes_and_reports():
    places, lookups = polling.fetch_polling_places(
        list(PLACES) + ["nowhere"], get=fake_get
    )
    assert [p["name"] for p in places] == ["Ohio Union", "Main Library"]
    assert places[0]["official"] and len(places[0]["matched_addresses"]) == 2
    assert lookups[2]["skipped_without_coordinates"] == 1
    assert lookups[3] == {
        "address": "nowhere",
        "status": "error",
        "detail": "Election unknown",
    }


def test_missing_key(monkeypatch):
    monkeypatch.delenv("GOOGLE_CIVIC_API_KEY")
    with pytest.raises(polling.PollingError, match="GOOGLE_CIVIC_API_KEY"):
        polling.fetch_polling_places(["x"], get=fake_get)


def test_imported_jurisdiction_is_solvable():
    places, _ = polling.fetch_polling_places(list(PLACES), get=fake_get)
    data = polling.build_jurisdiction(places, "Franklin County", "Ohio", "OH")
    assert data["jurisdiction"]["real_locations"]
    assert data["locations"][0]["address"].startswith("1739 N High St")
    plan = solve(data)
    assert plan["minimums_met"] and plan["coverage"] == 1


def test_no_places_is_explicit():
    with pytest.raises(polling.PollingError, match="No polling places"):
        polling.build_jurisdiction([], "X", "Ohio", "OH")


def test_import_api_survives_reset_and_worker_can_cancel(monkeypatch):
    monkeypatch.setattr(polling.httpx, "get", fake_get)
    c = TestClient(app)
    h = {"X-Demo-Session": c.post("/api/sessions").json()["session_id"]}
    body = {
        "addresses": list(PLACES),
        "name": "Franklin County",
        "state": "Ohio",
        "code": "OH",
    }
    result = c.post("/api/polling-places/import", json=body, headers=h).json()
    jid = result["import"]["jurisdiction_id"]
    assert jid in {j["jurisdiction"]["id"] for j in result["jurisdictions"]}
    base = f"/api/jurisdictions/{jid}"
    d = c.post(base + "/generate", headers=h).json()
    j = next(x for x in d["jurisdictions"] if x["jurisdiction"]["id"] == jid)
    c.post(base + "/approve", headers=h, json={"revision": j["revision"]})
    wid = j["plan"]["assignments"][0]["worker_id"]
    after = c.post(f"{base}/workers/{wid}/unavailable", headers=h).json()
    j = next(x for x in after["jurisdictions"] if x["jurisdiction"]["id"] == jid)
    assert j["plan"]["disrupted"] and j["impact"]["cancelled_ids"] == [wid]
    recovered = c.post(base + "/recover", headers=h).json()
    j = next(x for x in recovered["jurisdictions"] if x["jurisdiction"]["id"] == jid)
    assert wid not in {a["worker_id"] for a in j["plan"]["assignments"]}
    reset = c.post("/api/reset", headers=h).json()
    j = next(x for x in reset["jurisdictions"] if x["jurisdiction"]["id"] == jid)
    assert j["plan"] is None and not any(w["cancelled"] for w in j["workers"])


def test_unassigned_worker_can_mark_unavailable():
    c = TestClient(app)
    h = {"X-Demo-Session": c.post("/api/sessions").json()["session_id"]}
    result = c.post(
        "/api/jurisdictions/wake-nc/workers/NC-002/unavailable", headers=h
    ).json()
    worker = next(
        w for w in result["jurisdictions"][0]["workers"] if w["id"] == "NC-002"
    )
    assert worker["cancelled"]
