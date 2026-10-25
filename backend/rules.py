"""Snug's rules engine.

AI (or the parent's taps) only says WHERE things are. Every pass/fail decision lives here,
in plain code with unit tests. When the inputs are not good enough the answer is "unsure"
("couldn't tell"), never a guess. The best possible headline is "Visible checks passed";
Snug never says "safe".

Coordinates are fractions of the image (x right, y down, both 0-1).
"""

from datetime import date

PASS, FAIL, UNSURE, TODO = "pass", "fail", "unsure", "todo"

# Tolerances are fractions of torso length (shoulder line to hip line).
ARMPIT_BELOW_SHOULDER = 0.18  # armpit level sits a little below the shoulder line
CLIP_OK = 0.12  # within this of armpit level: pass
CLIP_LOW = 0.25  # this far below armpit level: clearly too low (belly)
CLIP_HIGH = 0.20  # this far above armpit level: clearly too high (neck)
STRAP_OK = 0.03  # strap slot this close to the shoulder line still counts
STRAP_BAD = 0.10  # beyond this on the wrong side: clearly wrong slot
MIN_TORSO = 0.06  # shorter torso than this means the points are not usable
MIN_CONFIDENCE = 0.6  # vision flags below this confidence become "unsure"

POINTS = [
    "left_shoulder",
    "right_shoulder",
    "chest_clip",
    "left_strap",
    "right_strap",
    "hips",
]


def item(id, status, title, detail, fix=None, at=None, group="photo"):
    return {
        "id": id,
        "status": status,
        "title": title,
        "detail": detail,
        "fix": fix,
        "at": at,
        "group": group,
    }


def _mean(a, b, key):
    return (a[key] + b[key]) / 2


def geometry(points):
    """Return shoulder line, armpit line and torso length, or None if unusable."""
    needed = ("left_shoulder", "right_shoulder", "hips")
    if any(not points.get(k) for k in needed):
        return None
    shoulder = _mean(points["left_shoulder"], points["right_shoulder"], "y")
    torso = points["hips"]["y"] - shoulder
    if torso < MIN_TORSO:
        return None
    return {
        "shoulder_y": shoulder,
        "armpit_y": shoulder + ARMPIT_BELOW_SHOULDER * torso,
        "torso": torso,
    }


def check_clip(points, geo):
    clip = points.get("chest_clip")
    if not geo or not clip:
        return item(
            "clip",
            UNSURE,
            "Chest clip",
            "Couldn't find the chest clip or the shoulders in this photo.",
            "Retake the photo with shoulders to hips in the frame.",
            clip,
        )
    offset = (clip["y"] - geo["armpit_y"]) / geo["torso"]
    if abs(offset) <= CLIP_OK:
        return item(
            "clip", PASS, "Chest clip", "The chest clip is at armpit level.", at=clip
        )
    if offset >= CLIP_LOW:
        return item(
            "clip",
            FAIL,
            "Chest clip",
            "The chest clip is too low, down near the belly. In a crash, the straps can slide off the shoulders.",
            "Slide the chest clip up to armpit level.",
            clip,
        )
    if offset <= -CLIP_HIGH:
        return item(
            "clip",
            FAIL,
            "Chest clip",
            "The chest clip is too high, up near the neck.",
            "Slide the chest clip down to armpit level.",
            clip,
        )
    return item(
        "clip",
        UNSURE,
        "Chest clip",
        "The chest clip is close to armpit level, but it's borderline.",
        "Check by eye that the clip lines up with the armpits.",
        clip,
    )


def check_straps(points, geo, direction):
    left, right = points.get("left_strap"), points.get("right_strap")
    if not geo or not left or not right:
        return item(
            "straps",
            UNSURE,
            "Strap height",
            "Couldn't see where the straps come out of the seat.",
            "Retake the photo so both straps are visible above the shoulders.",
        )
    at = {"x": _mean(left, right, "x"), "y": _mean(left, right, "y")}
    rel = (at["y"] - geo["shoulder_y"]) / geo["torso"]  # + means below shoulders
    if direction == "rear":
        if rel >= -STRAP_OK:
            return item(
                "straps",
                PASS,
                "Strap height",
                "Rear-facing: the straps come out at or just below the shoulders.",
                at=at,
            )
        if rel <= -STRAP_BAD:
            return item(
                "straps",
                FAIL,
                "Strap height",
                "Rear-facing: the straps come out above the shoulders.",
                "Move the straps to the slot at or just below the shoulders.",
                at,
            )
    else:
        if rel <= STRAP_OK:
            return item(
                "straps",
                PASS,
                "Strap height",
                "Forward-facing: the straps come out at or just above the shoulders.",
                at=at,
            )
        if rel >= STRAP_BAD:
            return item(
                "straps",
                FAIL,
                "Strap height",
                "Forward-facing: the straps come out below the shoulders.",
                "Move the straps to the slot at or just above the shoulders.",
                at,
            )
    return item(
        "straps",
        UNSURE,
        "Strap height",
        "The strap slot is right at the shoulder line, so a photo can't tell which side it's on.",
        "Check the slot against your seat's manual.",
        at,
    )


def check_flag(id, title, flag, bad_detail, good_detail, fix, at=None):
    """Yes/no observations (bulky coat, twisted strap) from the parent or the vision model."""
    flag = flag or {}
    present = flag.get("present")
    confidence = flag.get("confidence", 1.0)
    if present is None or confidence < MIN_CONFIDENCE:
        return item(
            id,
            UNSURE,
            title,
            "Couldn't tell from this photo.",
            "Check this one by eye.",
            at,
        )
    if present:
        return item(id, FAIL, title, bad_detail, fix, at)
    return item(id, PASS, title, good_detail, at=at)


def check_photo(points, direction, flags):
    points = points or {}
    flags = flags or {}
    geo = geometry(points)
    return [
        check_clip(points, geo),
        check_straps(points, geo, direction),
        check_flag(
            "coat",
            "No bulky coat",
            flags.get("coat"),
            "A puffy coat is under the harness. It squashes flat in a crash and leaves the straps loose.",
            "No bulky coat under the harness.",
            "Take the coat off, buckle up, then lay the coat over the straps like a blanket.",
        ),
        check_flag(
            "twist",
            "Straps lie flat",
            flags.get("twist"),
            "A strap is twisted, which concentrates crash forces on a narrow edge.",
            "The straps lie flat.",
            "Unbuckle and flatten the strap all the way from the seat to the buckle.",
        ),
    ]


def check_hands_on(pinch, inch):
    out = []
    if pinch is None:
        out.append(
            item(
                "pinch",
                TODO,
                "Pinch test",
                "Not done yet.",
                group="hands",
            )
        )
    elif pinch == "fold":
        out.append(
            item(
                "pinch",
                FAIL,
                "Pinch test",
                "You could pinch a fold in the strap at the collarbone, so the harness is too loose.",
                "Pull the harness tighter until you can't pinch any slack.",
                group="hands",
            )
        )
    else:
        out.append(
            item(
                "pinch",
                PASS,
                "Pinch test",
                "No slack at the collarbone. The harness is snug.",
                group="hands",
            )
        )
    if inch is None:
        out.append(
            item("inch", TODO, "Inch test", "Not done yet.", group="hands")
        )
    elif inch == "moves":
        out.append(
            item(
                "inch",
                FAIL,
                "Inch test",
                "The seat moves more than an inch at the belt path.",
                "Press the seat down and tighten the seat belt or LATCH strap, then test again.",
                group="hands",
            )
        )
    else:
        out.append(
            item(
                "inch",
                PASS,
                "Inch test",
                "The seat moves less than an inch at the belt path.",
                group="hands",
            )
        )
    return out


def add_years(day, years):
    try:
        return day.replace(year=day.year + years)
    except ValueError:  # Feb 29
        return day.replace(year=day.year + years, day=28)


def check_label(made, lifespan_years, today=None):
    """made: 'YYYY-MM' from the seat label; lifespan_years: from the label or manual."""
    today = today or date.today()
    if not made or not lifespan_years:
        return item(
            "expiry",
            TODO,
            "Seat expiration",
            "Add the date of manufacture and lifespan from the seat's label.",
            group="label",
        )
    try:
        year, month = (int(p) for p in made.split("-")[:2])
        expires = add_years(date(year, month, 1), int(lifespan_years))
    except (ValueError, TypeError):
        return item(
            "expiry",
            UNSURE,
            "Seat expiration",
            "Couldn't read that date. Use the format year-month, like 2021-06.",
            group="label",
        )
    label = expires.strftime("%B %Y")
    if today >= expires:
        return item(
            "expiry",
            FAIL,
            "Seat expiration",
            f"This seat expired in {label}. Plastic weakens with age and heat.",
            "Replace the seat, and cut the straps before throwing the old one away.",
            group="label",
        )
    months_left = (expires.year - today.year) * 12 + expires.month - today.month
    if months_left <= 6:
        return item(
            "expiry",
            PASS,
            "Seat expiration",
            f"Not expired, but it expires soon, in {label}. Plan a replacement.",
            group="label",
        )
    return item(
        "expiry",
        PASS,
        "Seat expiration",
        f"Not expired. Good until {label}.",
        group="label",
    )


def check_growth(direction, child, limits):
    """Compare the child's size with the seat's limits for the current direction."""
    child = child or {}
    limits = limits or {}
    rows = []
    for measure, unit in (("weight", "lb"), ("height", "in")):
        size = child.get(measure)
        limit = limits.get(f"{direction}_{measure}")
        if size and limit:
            rows.append((measure, unit, float(size), float(limit)))
    if not rows:
        return item(
            "growth",
            TODO,
            "Room to grow",
            "Add your child's size and the seat's limits to get an outgrow reminder.",
            group="label",
        )
    mode = "rear-facing" if direction == "rear" else "forward-facing"
    worst = max(rows, key=lambda r: r[2] / r[3])
    measure, unit, size, limit = worst
    share = round(100 * size / limit)
    if size >= limit:
        return item(
            "growth",
            FAIL,
            "Room to grow",
            f"Your child is over the seat's {mode} {measure} limit ({size:g} of {limit:g} {unit}).",
            "Follow the manual for the next stage, or move to a bigger seat.",
            group="label",
        )
    if share >= 90:
        return item(
            "growth",
            PASS,
            "Room to grow",
            f"Close to the {mode} {measure} limit: {share}% ({size:g} of {limit:g} {unit}). Plan the next step.",
            group="label",
        )
    return item(
        "growth",
        PASS,
        "Room to grow",
        f"Plenty of room: {share}% of the {mode} {measure} limit.",
        group="label",
    )


def headline(items):
    statuses = [i["status"] for i in items]
    if FAIL in statuses:
        return "fix"
    if UNSURE in statuses:
        return "unsure"
    return "passed"


def evaluate(payload):
    direction = "forward" if payload.get("direction") == "forward" else "rear"
    items = check_photo(payload.get("points"), direction, payload.get("flags"))
    items += check_hands_on(payload.get("pinch"), payload.get("inch"))
    items.append(check_label(payload.get("made"), payload.get("lifespan")))
    items.append(check_growth(direction, payload.get("child"), payload.get("limits")))
    photo = [i for i in items if i["group"] == "photo"]
    geo = geometry(payload.get("points") or {})
    return {
        "direction": direction,
        "lines": (
            {"shoulder_y": geo["shoulder_y"], "armpit_y": geo["armpit_y"]}
            if geo
            else None
        ),
        "items": items,
        "photo_headline": headline(photo),
        "headline": headline(items),
        "counts": {
            s: sum(i["status"] == s for i in items) for s in (PASS, FAIL, UNSURE, TODO)
        },
    }
