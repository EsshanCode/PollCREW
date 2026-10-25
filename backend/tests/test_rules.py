from datetime import date

import pytest
from fastapi.testclient import TestClient

from main import app
from rules import (
    check_growth,
    check_hands_on,
    check_label,
    check_photo,
    evaluate,
    headline,
)

# Shoulders at y=0.30 and hips at y=0.70: torso 0.40, armpit level 0.372.
BASE = {
    "left_shoulder": {"x": 0.62, "y": 0.30},
    "right_shoulder": {"x": 0.38, "y": 0.30},
    "hips": {"x": 0.50, "y": 0.70},
}


def photo(clip_y=0.38, strap_y=0.32, direction="rear", flags=None):
    points = dict(
        BASE,
        chest_clip={"x": 0.5, "y": clip_y},
        left_strap={"x": 0.58, "y": strap_y},
        right_strap={"x": 0.42, "y": strap_y},
    )
    flags = flags or {
        "coat": {"present": False, "confidence": 0.9},
        "twist": {"present": False, "confidence": 0.9},
    }
    return {i["id"]: i for i in check_photo(points, direction, flags)}


@pytest.mark.parametrize(
    "clip_y,status", [(0.38, "pass"), (0.55, "fail"), (0.27, "fail"), (0.43, "unsure")]
)
def test_chest_clip(clip_y, status):
    assert photo(clip_y=clip_y)["clip"]["status"] == status


def test_low_clip_explains_fix():
    clip = photo(clip_y=0.55)["clip"]
    assert "belly" in clip["detail"] and "armpit" in clip["fix"]


@pytest.mark.parametrize(
    "direction,strap_y,status",
    [
        ("rear", 0.32, "pass"),
        ("rear", 0.22, "fail"),
        ("rear", 0.28, "unsure"),
        ("forward", 0.25, "pass"),
        ("forward", 0.38, "fail"),
        ("forward", 0.325, "unsure"),
    ],
)
def test_strap_height_depends_on_direction(direction, strap_y, status):
    assert photo(strap_y=strap_y, direction=direction)["straps"]["status"] == status


def test_missing_points_are_unsure_not_guessed():
    items = {i["id"]: i for i in check_photo({}, "rear", {})}
    assert items["clip"]["status"] == "unsure"
    assert items["straps"]["status"] == "unsure"
    assert items["coat"]["status"] == "unsure"


def test_squashed_torso_is_unusable():
    points = {
        "left_shoulder": {"x": 0.6, "y": 0.5},
        "right_shoulder": {"x": 0.4, "y": 0.5},
        "hips": {"x": 0.5, "y": 0.52},
        "chest_clip": {"x": 0.5, "y": 0.51},
    }
    assert check_photo(points, "rear", {})[0]["status"] == "unsure"


def test_low_confidence_flag_is_unsure():
    flags = {"coat": {"present": True, "confidence": 0.4}}
    assert photo(flags=flags)["coat"]["status"] == "unsure"


def test_coat_and_twist_fail_with_fixes():
    flags = {
        "coat": {"present": True, "confidence": 0.9},
        "twist": {"present": True, "confidence": 0.9},
    }
    items = photo(flags=flags)
    assert items["coat"]["status"] == "fail" and "blanket" in items["coat"]["fix"]
    assert items["twist"]["status"] == "fail"


def test_hands_on():
    todo = check_hands_on(None, None)
    assert [i["status"] for i in todo] == ["todo", "todo"]
    bad = check_hands_on("fold", "moves")
    assert [i["status"] for i in bad] == ["fail", "fail"]
    good = check_hands_on("no_fold", "steady")
    assert [i["status"] for i in good] == ["pass", "pass"]


def test_label_expiration():
    today = date(2026, 10, 25)
    assert check_label("2016-05", 10, today)["status"] == "fail"
    soon = check_label("2017-02", 10, today)
    assert soon["status"] == "pass" and "soon" in soon["detail"]
    assert "2031" in check_label("2021-06", 10, today)["detail"]
    assert check_label(None, None, today)["status"] == "todo"
    assert check_label("June 2021", 10, today)["status"] == "unsure"


def test_growth():
    limits = {"rear_weight": 40, "rear_height": 40}
    over = check_growth("rear", {"weight": 41, "height": 30}, limits)
    assert over["status"] == "fail"
    near = check_growth("rear", {"weight": 37}, limits)
    assert near["status"] == "pass" and "Close" in near["detail"]
    assert check_growth("rear", {}, limits)["status"] == "todo"


def test_headline_never_says_safe():
    passing = evaluate(
        {
            "direction": "rear",
            "points": dict(
                BASE,
                chest_clip={"x": 0.5, "y": 0.38},
                left_strap={"x": 0.58, "y": 0.32},
                right_strap={"x": 0.42, "y": 0.32},
            ),
            "flags": {
                "coat": {"present": False, "confidence": 1},
                "twist": {"present": False, "confidence": 1},
            },
        }
    )
    assert passing["photo_headline"] == "passed"
    assert all("safe" not in i["detail"].lower() for i in passing["items"])
    assert headline([{"status": "pass"}, {"status": "unsure"}]) == "unsure"
    assert headline([{"status": "fail"}, {"status": "unsure"}]) == "fix"


def test_api_evaluate_and_config():
    client = TestClient(app)
    assert client.get("/api/health").json() == {"status": "ok"}
    body = {
        "direction": "rear",
        "points": dict(
            BASE,
            chest_clip={"x": 0.5, "y": 0.55},
            left_strap={"x": 0.58, "y": 0.32},
            right_strap={"x": 0.42, "y": 0.32},
        ),
        "flags": {"coat": {"present": False}, "twist": {"present": False}},
    }
    result = client.post("/api/evaluate", json=body).json()
    assert result["photo_headline"] == "fix"
    assert result["lines"]["armpit_y"] == pytest.approx(0.372)
    assert result["items"][0]["status"] == "fail"
    bad = client.post("/api/evaluate", json={"points": {"hips": {"x": 2, "y": 0}}})
    assert bad.status_code == 422


def test_detect_without_key_is_503(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    client = TestClient(app)
    assert client.get("/api/config").json() == {"vision": False}
    response = client.post("/api/detect", json={"image": "data:image/jpeg;base64,AAAA"})
    assert response.status_code == 503
