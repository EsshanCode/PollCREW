"""Optional point finder using Claude's vision.

The model returns WHERE things are (coordinates plus yes/no observations with confidence),
never a verdict. Snug's rules in rules.py make every decision. The image arrives with the
child's face already blurred on the parent's phone.
"""

import os

import httpx

API_URL = "https://api.anthropic.com/v1/messages"


class VisionError(Exception):
    pass


def configured():
    return bool(os.getenv("ANTHROPIC_API_KEY"))


def _point(description):
    return {
        "type": ["object", "null"],
        "description": description
        + " Use null if it is not clearly visible. x and y are fractions of the image width and height (0 = left/top, 1 = right/bottom).",
        "properties": {
            "x": {"type": "number", "minimum": 0, "maximum": 1},
            "y": {"type": "number", "minimum": 0, "maximum": 1},
        },
        "required": ["x", "y"],
    }


def _flag(description):
    return {
        "type": "object",
        "description": description,
        "properties": {
            "present": {"type": ["boolean", "null"]},
            "confidence": {"type": "number", "minimum": 0, "maximum": 1},
        },
        "required": ["present", "confidence"],
    }


TOOL = {
    "name": "report_positions",
    "description": "Report where harness parts and body landmarks are in a photo of a child (or doll) buckled into a car seat. Report positions only. Do not judge whether anything is correct.",
    "input_schema": {
        "type": "object",
        "properties": {
            "left_shoulder": _point("The child's left shoulder (viewer's right)."),
            "right_shoulder": _point("The child's right shoulder (viewer's left)."),
            "hips": _point("The center of the child's hip line, where the legs meet the body."),
            "chest_clip": _point("The center of the plastic chest clip joining the two harness straps."),
            "left_strap": _point("Where the harness strap on the child's left comes out of the seat shell, behind or above the shoulder."),
            "right_strap": _point("Where the harness strap on the child's right comes out of the seat shell, behind or above the shoulder."),
            "coat": _flag("Is the child wearing a bulky or puffy coat under the harness?"),
            "twist": _flag("Is either harness strap visibly twisted?"),
        },
        "required": [
            "left_shoulder",
            "right_shoulder",
            "hips",
            "chest_clip",
            "left_strap",
            "right_strap",
            "coat",
            "twist",
        ],
    },
}

PROMPT = (
    "This is a photo of a child or doll buckled into a car seat, taken from the front. "
    "The face may be blurred for privacy. Call report_positions with the positions you can "
    "clearly see. Use null for anything you cannot see clearly rather than guessing."
)


def find_points(image_b64, media_type="image/jpeg", post=None):
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key:
        raise VisionError("Automatic detection isn't set up on this server.")
    post = post or httpx.post
    try:
        response = post(
            API_URL,
            headers={
                "x-api-key": key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            timeout=45,
            json={
                "model": os.getenv("SNUG_MODEL", "claude-sonnet-5-5"),
                "max_tokens": 1024,
                "tools": [TOOL],
                "tool_choice": {"type": "tool", "name": "report_positions"},
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": media_type,
                                    "data": image_b64,
                                },
                            },
                            {"type": "text", "text": PROMPT},
                        ],
                    }
                ],
            },
        )
        response.raise_for_status()
        blocks = response.json().get("content", [])
    except httpx.HTTPError as exc:
        raise VisionError("Automatic detection failed. Tap the points instead.") from exc
    result = next(
        (b.get("input") for b in blocks if b.get("type") == "tool_use"), None
    )
    if not isinstance(result, dict):
        raise VisionError("Automatic detection returned nothing usable.")
    points = {}
    for name in (
        "left_shoulder",
        "right_shoulder",
        "hips",
        "chest_clip",
        "left_strap",
        "right_strap",
    ):
        p = result.get(name)
        if (
            isinstance(p, dict)
            and isinstance(p.get("x"), (int, float))
            and isinstance(p.get("y"), (int, float))
            and 0 <= p["x"] <= 1
            and 0 <= p["y"] <= 1
        ):
            points[name] = {"x": float(p["x"]), "y": float(p["y"])}
    flags = {}
    for name in ("coat", "twist"):
        f = result.get(name)
        if isinstance(f, dict):
            present = f.get("present")
            flags[name] = {
                "present": present if isinstance(present, bool) else None,
                "confidence": float(f.get("confidence") or 0),
            }
    return {"points": points, "flags": flags}
