import copy

from fastapi.testclient import TestClient

from ballots import COUNTIES, ISSUES, county_for_zip
from main import app
from matching import (
    agreement,
    confidence,
    crossed_party,
    lean,
    letters,
    match_ballot,
    match_race,
    score,
)

ISSUE_TEXT = {i["id"]: i["short"] for i in ISSUES}

# A suburban parent: wants smaller classes, slower growth, faster EMS.
PARENT = {
    "school_levy": {"stance": 1, "weight": 3},
    "school_buildings": {"stance": 1, "weight": 2},
    "taxes_services": {"stance": -1, "weight": 2},
    "housing_types": {"stance": 0, "weight": 1},
    "growth_pace": {"stance": 1, "weight": 3},
    "roads": {"stance": 1, "weight": 2},
    "public_safety": {"stance": 2, "weight": 3},
    "parks_libraries": {"stance": 1, "weight": 2},
}


def race(county, race_id):
    return next(r for r in COUNTIES[county]["races"] if r["id"] == race_id)


def test_kind_labels():
    from matching import kind

    assert kind(1, 2) == "agree"
    assert kind(0, 0) == "agree"
    assert kind(-1, 1) == "disagree"
    assert kind(0, -1) == "partly"
    assert kind(0, 2) == "disagree"


def test_agreement_scale():
    assert agreement(2, 2) == 1
    assert agreement(-2, 2) == 0
    assert agreement(1, 0) == 0.75


def test_score_uses_weights_and_skips_missing():
    answers = {"a": {"stance": 2, "weight": 3}, "b": {"stance": -2, "weight": 1}}
    positions = {"a": {"stance": 2}, "b": {"stance": 2}}
    assert score(answers, positions, ["a", "b"]) == (3 * 1 + 1 * 0) / 4
    assert score(answers, {"a": {"stance": None}}, ["a", "b"]) is None
    skipped = {"a": {"stance": None, "weight": 3}}
    assert score(skipped, positions, ["a"]) is None


def test_matching_is_money_blind():
    r = race("delaware", "del-commissioner")
    before = match_race(r, PARENT, ISSUE_TEXT)
    rich = copy.deepcopy(r)
    for cand in rich["candidates"]:
        cand["spending"] = 10_000_000 - cand["spending"]
        cand["party"] = "Green"
        cand["endorsements"] = ["Everyone"]
    after = match_race(rich, PARENT, ISSUE_TEXT)
    strip = lambda res: [(x["candidate_id"], x["match"], x["chance"]) for x in res["results"]]
    assert strip(before) == strip(after)


def test_demo_story_best_match_is_not_top_spender():
    result = match_ballot(COUNTIES["delaware"], PARENT, ISSUES, "Republican")
    commissioner = result["races"][0]
    assert commissioner["best"] == ["lk"]  # Linda Kowalczyk, $4,100
    assert commissioner["top_spender"] == "dw"  # Dana Whitfield, $86,400
    assert result["summary"]["best_not_top_spender"] >= 2


def test_confidence_is_reproducible_and_bounded():
    r = race("delaware", "del-olentangy")
    positions = [c["answers"] for c in r["candidates"]]
    a = confidence(PARENT, positions, r["issues"], 2, 7)
    b = confidence(PARENT, positions, r["issues"], 2, 7)
    assert a == b
    assert all(0 <= x <= 1 for x in a)
    assert abs(sum(a) - 2) < 1e-9  # two picks per draw for "vote for 2"


def test_clear_preference_gives_high_confidence():
    answers = {"x": {"stance": 2, "weight": 3}}
    positions = [{"x": {"stance": 2}}, {"x": {"stance": -2}}]
    chances = confidence(answers, positions, ["x"], 1, 1)
    assert chances[0] > 0.95


def test_letters_are_stable_shuffled_labels():
    r = race("franklin", "fr-ccs")
    assert letters(r) == letters(r)
    assert sorted(letters(r).values()) == ["A", "B", "C", "D"]


def test_vote_for_two_returns_two_best():
    result = match_race(race("delaware", "del-olentangy"), PARENT, ISSUE_TEXT)
    assert len(result["best"]) == 2
    assert result["results"][0]["why"][0]["kind"] in ("agree", "partly")


def test_measure_lean():
    library = COUNTIES["delaware"]["measures"][0]
    assert lean(library, PARENT)["lean"] == "yes"
    frugal = {
        "parks_libraries": {"stance": -1, "weight": 2},
        "taxes_services": {"stance": 2, "weight": 3},
    }
    assert lean(library, frugal)["lean"] == "no"
    assert lean(library, {})["lean"] == "unknown"


def test_crossed_party():
    result = match_race(race("delaware", "del-commissioner"), PARENT, ISSUE_TEXT)
    assert crossed_party(result, "Republican") is False  # Kowalczyk is Republican
    assert crossed_party(result, "Democratic") is True
    assert crossed_party(result, None) is None


def test_zip_lookup():
    assert county_for_zip("2840 E Orange Rd, Lewis Center, OH 43035") == "delaware"
    assert county_for_zip("1739 N High St, Columbus, OH 43210") == "franklin"
    assert county_for_zip("Cleveland, OH 44114") is None


def test_api_flow_and_candidate_portal(monkeypatch):
    import main
    from census import CensusError

    def no_census(address):
        raise CensusError("The Census Bureau couldn't find that address.")

    monkeypatch.setattr(main, "districts", no_census)  # falls back to the demo ZIP list
    monkeypatch.setattr(main, "senate_money", lambda: None)
    client = TestClient(app)
    state = client.post("/api/sessions").json()
    sid = state["session_id"]
    h = {"X-Demo-Session": sid}
    assert [c["id"] for c in state["counties"]] == ["delaware", "franklin"]
    assert client.post("/api/lookup", json={"address": "Powell, OH 43065"}).json()["county"] == "delaware"
    assert client.post("/api/lookup", json={"address": "Akron 44308"}).status_code == 404

    result = client.post(
        "/api/match", headers=h, json={"county": "delaware", "answers": PARENT}
    ).json()
    assert len(result["races"]) == 3 and result["measures"][0]["lean"] == "yes"

    bad = client.post(
        "/api/candidates",
        headers=h,
        json={
            "county": "delaware",
            "race_id": "del-orange-trustee",
            "name": "Sam Lee",
            "party": "Republican",
            "answers": {},
        },
    )
    assert bad.status_code == 422  # nonpartisan race

    added = client.post(
        "/api/candidates",
        headers=h,
        json={
            "county": "delaware",
            "race_id": "del-orange-trustee",
            "name": "Sam Lee",
            "party": "Nonpartisan",
            "spending": 900,
            "endorsements": [],
            "answers": {
                "growth_pace": {"stance": 1, "reason": "Plan first."},
                "public_safety": {"stance": 2, "reason": "Two more medics."},
                "roads": {"stance": 1, "reason": "Fix Orange Road."},
                "parks_libraries": {"stance": 1, "reason": "Finish the trails."},
            },
        },
    ).json()
    trustee = next(
        r for r in added["counties"][0]["races"] if r["id"] == "del-orange-trustee"
    )
    assert trustee["candidates"] == 4 and trustee["self_reported"] == 1
    again = client.post(
        "/api/match", headers=h, json={"county": "delaware", "answers": PARENT}
    ).json()
    trustee_match = next(r for r in again["races"] if r["race_id"] == "del-orange-trustee")
    sam = next(x for x in trustee_match["results"] if x["candidate_id"] == added["candidate_id"])
    assert any(row["kind"] == "skipped" for row in sam["why"])  # housing left blank
    assert trustee_match["reveal"][added["candidate_id"]]["source"] == "self"

    other = client.post("/api/sessions").json()["session_id"]
    fresh = client.get("/api/state", headers={"X-Demo-Session": other}).json()
    assert fresh["counties"][0]["races"][2]["candidates"] == 3  # sessions are separate
    unknown = client.post(
        "/api/match",
        headers=h,
        json={"county": "delaware", "answers": {"nope": {"stance": 1}}},
    )
    assert unknown.status_code == 422
