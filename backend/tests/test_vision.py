import httpx
import pytest

from vision import VisionError, find_points


class FakeResponse:
    def __init__(self, payload, status=200):
        self.payload = payload
        self.status = status

    def raise_for_status(self):
        if self.status >= 400:
            raise httpx.HTTPStatusError(
                "bad", request=httpx.Request("POST", "x"), response=None
            )

    def json(self):
        return self.payload


def test_find_points_keeps_only_valid_coordinates(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test")
    sent = {}

    def post(url, headers, timeout, json):
        sent.update(json)
        return FakeResponse(
            {
                "content": [
                    {
                        "type": "tool_use",
                        "name": "report_positions",
                        "input": {
                            "left_shoulder": {"x": 0.62, "y": 0.3},
                            "right_shoulder": {"x": 0.38, "y": 0.3},
                            "hips": {"x": 0.5, "y": 0.7},
                            "chest_clip": {"x": 0.5, "y": 1.7},
                            "left_strap": None,
                            "right_strap": {"x": 0.42, "y": 0.31},
                            "coat": {"present": False, "confidence": 0.8},
                            "twist": {"present": "maybe", "confidence": 0.9},
                        },
                    }
                ]
            }
        )

    result = find_points("AAAA", post=post)
    assert sent["tool_choice"] == {"type": "tool", "name": "report_positions"}
    assert sent["messages"][0]["content"][0]["type"] == "image"
    assert "chest_clip" not in result["points"]  # out of range: dropped, not clamped
    assert "left_strap" not in result["points"]
    assert result["points"]["hips"] == {"x": 0.5, "y": 0.7}
    assert result["flags"]["coat"] == {"present": False, "confidence": 0.8}
    assert result["flags"]["twist"]["present"] is None


def test_find_points_errors(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    with pytest.raises(VisionError):
        find_points("AAAA")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test")
    with pytest.raises(VisionError):
        find_points("AAAA", post=lambda *a, **k: FakeResponse({}, status=500))
    with pytest.raises(VisionError):
        find_points("AAAA", post=lambda *a, **k: FakeResponse({"content": []}))
