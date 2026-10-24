import copy
import math
import pytest
from fastapi.testclient import TestClient
from data import dataset
from engine import (
    PlanError,
    analytic_risk,
    budget_curve,
    eligible,
    expected_wait,
    simulate,
    site_risk,
    solve,
)
from extraction import extract
from main import app, sessions


@pytest.fixture(autouse=True)
def offline(monkeypatch):
    monkeypatch.setenv("EMBEDDING_MODE", "offline")
    monkeypatch.setenv("EXTRACTION_MODE", "offline")


@pytest.mark.parametrize("jid", ["wake-nc", "dane-wi", "maricopa-az"])
def test_assignment_constraints(jid):
    d = dataset()[jid]
    p = solve(d)
    assert p["coverage"] == 1
    assert len({a["worker_id"] for a in p["assignments"]}) == len(p["assignments"])
    for a in p["assignments"]:
        w = next(w for w in d["workers"] if w["id"] == a["worker_id"])
        l = next(l for l in d["locations"] if l["id"] == a["location_id"])
        r = next(r for r in l["requirements"] if r["role"] == a["role"])
        assert eligible(w, l, r)
    for l in d["locations"]:
        for r in l["requirements"]:
            count = sum(
                a["location_id"] == l["id"] and a["role"] == r["role"]
                for a in p["assignments"]
            )
            limit = r["desired"] + (d["surge_budget"] if r["role"] == "Check-in" else 0)
            assert r["minimum"] <= count <= limit
    assert p["surge_assigned"] <= d["surge_budget"]


def test_rejected_skills_availability_training_travel():
    d = dataset()["wake-nc"]
    w, l = d["workers"][1], d["locations"][0]
    r = l["requirements"][0]
    assert eligible(w, l, r)
    for patch in [
        {"confirmed_skills": [], "rejected_skills": ["check_in"]},
        {"available_end": 12},
        {"available_start": 9},
        {"trained": False},
        {"max_travel_km": 0},
        {"cancelled": True},
    ]:
        assert not eligible({**w, **patch}, l, r)


def test_recovery_preserves_locks_and_excludes_cancelled():
    d = dataset()["wake-nc"]
    initial = solve(d)
    cancelled = {a["worker_id"] for a in initial["assignments"][:3]}
    for w in d["workers"]:
        w["cancelled"] = w["id"] in cancelled
    locked = [a for a in initial["assignments"] if a["worker_id"] not in cancelled]
    revised = solve(d, locked=locked)
    assert revised["coverage"] == 1
    assert all(a in revised["assignments"] for a in locked)
    assert not cancelled & {a["worker_id"] for a in revised["assignments"]}


def test_insufficient_backups_explicit():
    d = dataset()["wake-nc"]
    locked = solve(d)["assignments"][:1]
    for w in d["workers"]:
        w["cancelled"] = w["id"] != locked[0]["worker_id"]
    with pytest.raises(PlanError, match="No feasible plan"):
        solve(d, locked=locked)


def test_invalid_lock_fails():
    d = dataset()["wake-nc"]
    a = solve(d)["assignments"][0]
    next(w for w in d["workers"] if w["id"] == a["worker_id"])["cancelled"] = True
    with pytest.raises(PlanError, match="no longer eligible"):
        solve(d, locked=[a])


def test_seed_and_queue_boundaries():
    d = dataset()["wake-nc"]
    a = solve(d)["assignments"]
    one = simulate(d, a)
    assert one == simulate(d, a)
    assert one["runs"] == 5000
    assert math.isinf(expected_wait(80, 2.5, 0))
    assert math.isinf(expected_wait(96, 2.5, 4))
    assert expected_wait(0, 2.5, 0) == 0
    assert expected_wait(40, 2.5, 4) < expected_wait(80, 2.5, 4)
    zero = simulate(d, [])
    assert zero["risk_percent"] == 100
    assert all(l["zero_staff_percent"] == 100 for l in zero["locations"])


def test_baseline_valid_and_inputs_unchanged():
    d = dataset()["dane-wi"]
    original = copy.deepcopy(d)
    b = solve(d, baseline=True)
    assert d == original
    assert len({a["worker_id"] for a in b["assignments"]}) == len(b["assignments"])
    assert b["status"] == "GREEDY"
    assert b["coverage"] > 0


def test_extraction_evidence_and_negation():
    text = "I led a team. I do not speak Spanish. I troubleshoot printers."
    result = extract(text)
    assert {s["skill"] for s in result["suggestions"]} == {"leadership", "equipment"}
    assert all(s["evidence"] in text for s in result["suggestions"])


def test_api_full_flow_reset_isolation():
    c = TestClient(app)
    first, second = c.post("/api/sessions").json(), c.post("/api/sessions").json()
    h = {"X-Demo-Session": first["session_id"]}
    base = "/api/jurisdictions/wake-nc"
    assert c.post(base + "/cancel", headers=h).status_code == 409
    result = c.post(base + "/generate", headers=h)
    assert result.status_code == 200
    d = result.json()["jurisdictions"][0]
    assert c.post(base + "/approve", headers=h, json={"revision": 0}).status_code == 409
    assert (
        c.post(
            base + "/approve", headers=h, json={"revision": d["revision"]}
        ).status_code
        == 200
    )
    cancelled = c.post(base + "/cancel", headers=h).json()["jurisdictions"][0]
    locked = cancelled["plan"]["assignments"]
    assert cancelled["impact"]["lost_assignments"] == 3
    assert (
        c.post(
            base + "/approve", headers=h, json={"revision": cancelled["revision"]}
        ).status_code
        == 409
    )
    recovered = c.post(base + "/recover", headers=h).json()["jurisdictions"][0]
    assert recovered["impact"]["recovered"] == 3
    assert all(a in recovered["plan"]["assignments"] for a in locked)
    assert (
        c.post(
            base + "/approve", headers=h, json={"revision": recovered["revision"]}
        ).status_code
        == 200
    )
    assert sessions[second["session_id"]]["data"]["wake-nc"]["plan"] is None
    reset = c.post("/api/reset", headers=h).json()["jurisdictions"][0]
    assert reset["plan"] is None
    assert not any(w["cancelled"] for w in reset["workers"])


def test_worker_rejection_and_bad_config_api():
    c = TestClient(app)
    session = c.post("/api/sessions").json()
    h = {"X-Demo-Session": session["session_id"]}
    w = session["jurisdictions"][0]["workers"][1]
    w.update(confirmed_skills=["accessibility"], rejected_skills=["check_in"])
    path = "/api/jurisdictions/wake-nc"
    assert c.put(path + "/workers/" + w["id"], json=w, headers=h).status_code == 200
    w["confirmed_skills"].append("check_in")
    assert c.put(path + "/workers/" + w["id"], json=w, headers=h).status_code == 422
    loc = session["jurisdictions"][0]["locations"][0]
    loc["requirements"][0]["minimum"] = 20
    assert (
        c.put(path + "/locations/" + loc["id"], json=loc, headers=h).status_code == 422
    )


def test_failed_recovery_preserves_disrupted_state():
    c = TestClient(app)
    session = c.post("/api/sessions").json()
    h = {"X-Demo-Session": session["session_id"]}
    base = "/api/jurisdictions/wake-nc"
    d = c.post(base + "/generate", headers=h).json()["jurisdictions"][0]
    c.post(base + "/approve", headers=h, json={"revision": d["revision"]})
    c.post(base + "/cancel", headers=h)
    data = sessions[session["session_id"]]["data"]["wake-nc"]
    locked = {a["worker_id"] for a in data["plan"]["assignments"]}
    for w in data["workers"]:
        if w["id"] not in locked:
            w["cancelled"] = True
    before = copy.deepcopy(data)
    assert c.post(base + "/recover", headers=h).status_code == 409
    assert data == before
    first = data["locations"][0]
    remaining = sum(
        a["location_id"] == first["id"] and a["role"] == "Check-in"
        for a in data["plan"]["assignments"]
    )
    assert data["plan"]["gaps"][0]["unfilled"] == (
        first["requirements"][0]["desired"] - remaining
    )
    assert data["plan"]["simulation"]["analytic_risk_percent"] == 100


def test_soft_desired_gap_and_hard_minimum_distinction():
    d = dataset()["wake-nc"]
    for loc in d["locations"]:
        loc["requirements"][0]["desired"] = 20
    p = solve(d)
    assert p["coverage"] < 1
    assert p["minimums_met"]
    assert p["gaps"]


def test_live_extraction_validates_evidence(monkeypatch):
    import extraction

    monkeypatch.setenv("EXTRACTION_MODE", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "synthetic-test-key")

    class Response:
        def raise_for_status(self):
            pass

        def json(self):
            return {
                "choices": [
                    {
                        "message": {
                            "content": '{"suggestions":[{"skill":"spanish","evidence":"Invented quote"}]}'
                        }
                    }
                ]
            }

    monkeypatch.setattr(extraction.httpx, "post", lambda *a, **kw: Response())
    with pytest.raises(ValueError, match="unsupported evidence"):
        extract("I helped at registration.")


def test_exact_risk_matches_monte_carlo():
    d = dataset()["maricopa-az"]
    p = solve(d)
    sim = simulate(d, p["assignments"])
    assert abs(sim["risk_percent"] - sim["analytic_risk_percent"]) < 1.5
    assert sim["analytic_risk_percent"] == analytic_risk(d, p["assignments"])
    for site in sim["locations"]:
        assert abs(site["risk_percent"] - site["analytic_risk_percent"]) < 1.5
    assert site_risk(80, 2.5, [1.0] * 3) == 1
    assert site_risk(80, 2.5, [1.0] * 4) == 0
    assert abs(site_risk(74, 2.5, [0.92] * 4) - (1 - 0.92**4)) < 1e-9


@pytest.mark.parametrize("jid", ["wake-nc", "dane-wi", "maricopa-az"])
def test_optimizer_allocates_surge_better_than_even_spread(jid):
    d = dataset()[jid]
    for b in [2, 4, 6]:
        optimized = analytic_risk(d, solve(d, budget=b)["assignments"])
        even = analytic_risk(d, solve(d, baseline=True, budget=b)["assignments"])
        assert optimized < even


def test_budget_lowers_risk_and_is_respected():
    d = dataset()["wake-nc"]
    curve = budget_curve(d, 8)
    risks = [point["optimized_risk_percent"] for point in curve]
    assert all(a >= b for a, b in zip(risks, risks[1:]))
    assert risks[0] > 50 and risks[-1] < 5
    assert all(point["optimized_surge"] <= point["budget"] for point in curve)
    assert all(
        point["optimized_risk_percent"] <= point["even_risk_percent"] for point in curve
    )


def test_recovery_restores_low_risk_after_cancellations():
    d = dataset()["wake-nc"]
    initial = solve(d)
    first = d["locations"][0]["id"]
    ids = sorted(
        a["worker_id"]
        for a in initial["assignments"]
        if a["location_id"] == first and a["role"] == "Check-in"
    )[:3]
    for w in d["workers"]:
        w["cancelled"] = w["id"] in ids
    remaining = [a for a in initial["assignments"] if a["worker_id"] not in ids]
    assert analytic_risk(d, remaining) == 100
    revised = solve(d, locked=remaining)
    assert analytic_risk(d, revised["assignments"]) == analytic_risk(
        d, initial["assignments"]
    )
    assert revised["surge_assigned"] <= d["surge_budget"]


def test_budget_api_requires_draft():
    c = TestClient(app)
    session = c.post("/api/sessions").json()
    h = {"X-Demo-Session": session["session_id"]}
    path = "/api/jurisdictions/dane-wi"
    assert (
        c.put(path + "/budget", json={"surge_budget": 21}, headers=h).status_code == 422
    )
    updated = c.put(path + "/budget", json={"surge_budget": 2}, headers=h).json()
    assert updated["jurisdictions"][1]["surge_budget"] == 2
    generated = c.post(path + "/generate", headers=h).json()["jurisdictions"][1]
    assert generated["plan"]["surge_assigned"] <= 2
    assert len(generated["curve"]) == 9
    assert (
        c.put(path + "/budget", json={"surge_budget": 3}, headers=h).status_code == 409
    )
