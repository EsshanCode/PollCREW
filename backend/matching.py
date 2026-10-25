"""Blind Ballot matching.

Money-blind by construction: every scoring function receives only stated policy positions.
Spending, party and endorsements are attached afterwards, for the reveal, and cannot change
anyone's match.

Match: weighted agreement over the issues an office actually handles, using the voter's own
importance weights. agreement = 1 - |voter - candidate| / 4 on the shared -2..2 scale.

Confidence: people are not perfectly sure of their own answers or priorities, so we rerun the
match 2,000 times with small random changes to the voter's stances and weights (Monte Carlo)
and report how often each candidate stays in the voter's top picks.
"""

import hashlib
import json
import random

import numpy as np

DRAWS = 2000
WEIGHT_NOISE = 0.35  # log-normal spread on importance weights
STANCE_NOISE = 0.6  # normal spread on stances, clipped to the scale
CLOSE_CALL = 0.6


def agreement(voter, candidate):
    return 1 - abs(voter - candidate) / 4


def _answered(answers, issues):
    return [
        i
        for i in issues
        if answers.get(i) is not None
        and answers[i].get("stance") is not None
        and answers[i].get("weight", 0) > 0
    ]


def score(answers, positions, issues):
    """Weighted agreement (0-1) between a voter and one candidate, or None if no overlap.

    positions: {issue: {"stance": int | None, ...}} -- positions only, nothing else.
    """
    num = den = 0.0
    for i in _answered(answers, issues):
        cand = positions.get(i)
        if not cand or cand.get("stance") is None:
            continue
        w = answers[i]["weight"]
        num += w * agreement(answers[i]["stance"], cand["stance"])
        den += w
    return num / den if den else None


def _seed(*parts):
    digest = hashlib.sha256(json.dumps(parts, sort_keys=True).encode()).hexdigest()
    return int(digest[:12], 16)


def letters(race):
    """Stable, shuffled blind labels so 'Candidate A' is never just the first or richest."""
    ids = [c["id"] for c in race["candidates"]]
    random.Random(_seed("letters", race["id"], ids)).shuffle(ids)
    return {cid: chr(ord("A") + n) for n, cid in enumerate(ids)}


def confidence(answers, positions_list, issues, top_k, seed):
    """Share of Monte Carlo draws in which each candidate lands in the voter's top_k."""
    used = _answered(answers, issues)
    n = len(positions_list)
    if not used or n == 0:
        return [None] * n
    rng = np.random.default_rng(seed)
    v = np.array([answers[i]["stance"] for i in used], float)
    w = np.array([answers[i]["weight"] for i in used], float)
    s = np.array(
        [
            [
                (p.get(i) or {}).get("stance")
                if (p.get(i) or {}).get("stance") is not None
                else np.nan
                for i in used
            ]
            for p in positions_list
        ],
        float,
    )
    mask = ~np.isnan(s)
    s = np.nan_to_num(s)
    vv = np.clip(v + rng.normal(0, STANCE_NOISE, (DRAWS, len(used))), -2, 2)
    ww = w * np.exp(rng.normal(0, WEIGHT_NOISE, (DRAWS, len(used))))
    agree = 1 - np.abs(vv[:, None, :] - s[None, :, :]) / 4  # draws x candidates x issues
    weights = ww[:, None, :] * mask[None, :, :]
    totals = weights.sum(axis=2)
    scores = np.where(totals > 0, (weights * agree).sum(axis=2) / np.maximum(totals, 1e-9), -1)
    scores += rng.uniform(0, 1e-9, scores.shape)  # break exact ties fairly
    k = max(1, min(top_k, n))
    top = np.argsort(-scores, axis=1)[:, :k]
    hits = np.zeros(n)
    for col in range(k):
        hits += np.bincount(top[:, col], minlength=n)
    return [float(h / DRAWS) for h in hits]


def kind(voter, candidate):
    """Plain-language label: same side agrees, opposite sides disagree."""
    if voter == candidate or voter * candidate > 0:
        return "agree"
    if voter * candidate < 0:
        return "disagree"
    return "partly" if abs(voter - candidate) == 1 else "disagree"


def explain(answers, positions, issues, issue_text):
    rows = []
    for i in issues:
        mine = answers.get(i)
        theirs = positions.get(i) or {}
        if not mine or mine.get("stance") is None or not mine.get("weight"):
            continue
        if theirs.get("stance") is None:
            rows.append({"issue": i, "short": issue_text[i], "kind": "skipped"})
            continue
        a = agreement(mine["stance"], theirs["stance"])
        rows.append(
            {
                "issue": i,
                "short": issue_text[i],
                "kind": kind(mine["stance"], theirs["stance"]),
                "agreement": a,
                "weight": mine["weight"],
                "voter": mine["stance"],
                "candidate": theirs["stance"],
                "reason": theirs.get("reason", ""),
            }
        )
    order = {"agree": 0, "partly": 1, "disagree": 2, "skipped": 3}
    rows.sort(key=lambda r: (order[r["kind"]], -r.get("weight", 0)))
    return rows


def match_race(race, answers, issue_text):
    labels = letters(race)
    positions = [c["answers"] for c in race["candidates"]]  # positions only
    scores = [score(answers, p, race["issues"]) for p in positions]
    chances = confidence(
        answers,
        positions,
        race["issues"],
        race["vote_for"],
        _seed("mc", race["id"], answers),
    )
    results = []
    for cand, s, chance in zip(race["candidates"], scores, chances):
        results.append(
            {
                "candidate_id": cand["id"],
                "letter": labels[cand["id"]],
                "match": None if s is None else round(100 * s),
                "chance": None if chance is None else round(chance, 3),
                "why": explain(answers, cand["answers"], race["issues"], issue_text),
            }
        )
    results.sort(
        key=lambda r: (r["match"] is None, -(r["match"] or 0), -(r["chance"] or 0), r["letter"])
    )
    best = [r["candidate_id"] for r in results[: race["vote_for"]] if r["match"] is not None]
    # Everything below is for the reveal only. It is computed after matching.
    reveal = {
        c["id"]: {
            "name": c["name"],
            "party": c["party"],
            "spending": c["spending"],
            "endorsements": c["endorsements"],
            "source": c.get("source", "demo"),
        }
        for c in race["candidates"]
    }
    top_spender = max(race["candidates"], key=lambda c: c["spending"])["id"]
    top_chance = results[0]["chance"] if results and results[0]["chance"] is not None else None
    return {
        "race_id": race["id"],
        "office": race["office"],
        "what": race["what"],
        "vote_for": race["vote_for"],
        "partisan": race["partisan"],
        "issues_used": len(_answered(answers, race["issues"])),
        "results": results,
        "best": best,
        "close_call": top_chance is not None and top_chance < CLOSE_CALL,
        "reveal": reveal,
        "top_spender": top_spender,
        "top_spender_is_best": top_spender in best,
    }


def lean(measure, answers):
    total = weight = 0.0
    for i in measure["yes_issues"]:
        a = answers.get(i)
        if a and a.get("stance") is not None and a.get("weight"):
            total += a["weight"] * a["stance"]
            weight += a["weight"] * 2
    for i in measure["no_issues"]:
        a = answers.get(i)
        if a and a.get("stance") is not None and a.get("weight"):
            total -= a["weight"] * a["stance"]
            weight += a["weight"] * 2
    if not weight:
        return {"lean": "unknown", "score": None}
    s = total / weight
    return {
        "lean": "yes" if s > 0.25 else "no" if s < -0.25 else "mixed",
        "score": round(s, 2),
    }


def crossed_party(race, usual):
    """Did the voter's best match come from outside their usual party (or its endorsement)?"""
    if usual not in ("Democratic", "Republican"):
        return None
    for cid in race["best"]:
        info = race["reveal"][cid]
        if race["partisan"]:
            if info["party"] != usual:
                return True
        else:
            endorsed = [e for e in info["endorsements"] if "Party" in e]
            if endorsed and not any(usual in e for e in endorsed):
                return True
    return False


def match_ballot(county, answers, issues, usual_party=None):
    issue_text = {i["id"]: i["short"] for i in issues}
    races = [match_race(r, answers, issue_text) for r in county["races"]]
    measures = [
        {
            "id": m["id"],
            "title": m["title"],
            "what": m["what"],
            **lean(m, answers),
        }
        for m in county["measures"]
    ]
    crossed = [crossed_party(r, usual_party) for r in races]
    matched = [r for r in races if r["best"]]
    outspent = [r for r in matched if not r["top_spender_is_best"]]
    return {
        "county": county["id"],
        "races": races,
        "measures": measures,
        "summary": {
            "races": len(races),
            "matched": len(matched),
            "best_not_top_spender": len(outspent),
            "crossed_party": sum(1 for x in crossed if x),
            "usual_party": usual_party,
        },
    }
