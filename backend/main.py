"""Blind Ballot API: local ballots, money-blind policy matching, and a candidate portal."""

import copy
import threading
import time
import uuid
from typing import Annotated, Literal, Optional

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field, field_validator

from ballots import COUNTIES, ISSUE_IDS, ISSUES, county_for_zip
from census import CensusError, districts
from fec import attach, senate_money
from matching import match_ballot
from ohio import COUNTY_BOARDS_URL, SAMPLE_BALLOT_URL, SOURCE, STATEWIDE

app = FastAPI(title="Blind Ballot", version="1.0.0")
sessions = {}
mutex = threading.RLock()
Session = Annotated[str, Header(alias="X-Demo-Session")]
PARTIES = ["Democratic", "Republican", "Independent", "Libertarian", "Green", "Nonpartisan"]


class Answer(BaseModel):
    stance: Optional[int] = Field(default=None, ge=-2, le=2)
    weight: int = Field(default=2, ge=0, le=3)


class MatchRequest(BaseModel):
    county: str
    answers: dict[str, Answer]
    usual_party: Optional[Literal["Democratic", "Republican", "Independent", "None"]] = None

    @field_validator("answers")
    @classmethod
    def known(cls, value):
        unknown = set(value) - set(ISSUE_IDS)
        if unknown:
            raise ValueError(f"Unknown issue: {sorted(unknown)[0]}")
        return value


class Lookup(BaseModel):
    address: str = Field(min_length=3, max_length=200)


class CandidateAnswer(BaseModel):
    stance: Optional[int] = Field(default=None, ge=-2, le=2)
    reason: str = Field(default="", max_length=160)


class CandidateIn(BaseModel):
    county: str
    race_id: str
    name: str = Field(min_length=2, max_length=60)
    party: Literal[
        "Democratic", "Republican", "Independent", "Libertarian", "Green", "Nonpartisan"
    ]
    spending: int = Field(default=0, ge=0, le=50_000_000)
    endorsements: list[str] = Field(default=[], max_length=3)
    answers: dict[str, CandidateAnswer]

    @field_validator("endorsements")
    @classmethod
    def short(cls, value):
        value = [e.strip() for e in value if e.strip()]
        if any(len(e) > 60 for e in value):
            raise ValueError("Keep each endorsement under 60 characters")
        return value


def session(sid):
    if sid not in sessions:
        raise HTTPException(404, "Demo session expired. Reload to start a fresh demo.")
    sessions[sid]["touched"] = time.monotonic()
    return sessions[sid]


def snapshot(sid):
    counties = session(sid)["counties"]
    return {
        "session_id": sid,
        "issues": ISSUES,
        "parties": PARTIES,
        "counties": [
            {
                "id": c["id"],
                "name": c["name"],
                "place": c["place"],
                "sample_address": c["sample_address"],
                "races": [
                    {
                        "id": r["id"],
                        "office": r["office"],
                        "what": r["what"],
                        "vote_for": r["vote_for"],
                        "partisan": r["partisan"],
                        "issues": r["issues"],
                        "candidates": len(r["candidates"]),
                        "self_reported": sum(
                            1 for x in r["candidates"] if x["source"] == "self"
                        ),
                    }
                    for r in c["races"]
                ],
                "measures": [
                    {"id": m["id"], "title": m["title"], "what": m["what"]}
                    for m in c["measures"]
                ],
            }
            for c in counties.values()
        ],
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/sessions")
def create_session():
    with mutex:
        for key in list(sessions):
            if time.monotonic() - sessions[key]["touched"] > 86400:
                del sessions[key]
        if len(sessions) >= 500:
            raise HTTPException(503, "Demo is busy. Try again in a minute.")
        sid = str(uuid.uuid4())
        sessions[sid] = {"counties": copy.deepcopy(COUNTIES), "touched": time.monotonic()}
        return snapshot(sid)


@app.get("/api/state")
def get_state(x_demo_session: Session):
    with mutex:
        return snapshot(x_demo_session)


@app.post("/api/reset")
def reset(x_demo_session: Session):
    with mutex:
        session(x_demo_session)["counties"] = copy.deepcopy(COUNTIES)
        return snapshot(x_demo_session)


DEMO_FIPS = {"39041": "delaware", "39049": "franklin"}


def statewide():
    money = senate_money()
    races = []
    for race in STATEWIDE:
        candidates = [dict(c) for c in race["candidates"]]
        if race.get("fec") == "senate":
            candidates = attach(candidates, money)
        races.append(
            {
                "id": race["id"],
                "office": race["office"],
                "detail": race["detail"],
                "candidates": candidates,
                "money_source": (money or {}).get("page") if race.get("fec") else None,
                "money_available": bool(money) if race.get("fec") else None,
            }
        )
    return races


@app.post("/api/lookup")
def lookup(body: Lookup):
    """Real districts from the Census Bureau, real statewide candidates, and the demo ballot if one exists."""
    found = None
    note = None
    try:
        found = districts(body.address)
    except CensusError as exc:
        if "outside Ohio" in str(exc):
            raise HTTPException(404, str(exc)) from exc
        note = str(exc)
    demo = DEMO_FIPS.get(found["county_fips"]) if found else county_for_zip(body.address)
    if not found and not demo:
        raise HTTPException(
            404,
            note or "Enter your full Ohio street address, city and ZIP.",
        )
    return {
        "county": demo,
        "districts": found,
        "districts_note": None if found else "Enter a full street address to see your exact districts.",
        "statewide": statewide(),
        "statewide_source": SOURCE,
        "links": {"voter_lookup": SAMPLE_BALLOT_URL, "county_boards": COUNTY_BOARDS_URL},
    }


@app.post("/api/match")
def match(body: MatchRequest, x_demo_session: Session):
    """Answers are used for this response only. They are never stored."""
    with mutex:
        counties = session(x_demo_session)["counties"]
        if body.county not in counties:
            raise HTTPException(404, "Unknown county")
        county = copy.deepcopy(counties[body.county])
    answers = {k: v.model_dump() for k, v in body.answers.items()}
    return match_ballot(county, answers, ISSUES, body.usual_party)


@app.post("/api/candidates")
def add_candidate(body: CandidateIn, x_demo_session: Session):
    with mutex:
        counties = session(x_demo_session)["counties"]
        county = counties.get(body.county)
        race = next((r for r in county["races"] if r["id"] == body.race_id), None) if county else None
        if not race:
            raise HTTPException(404, "Unknown race")
        if len(race["candidates"]) >= 8:
            raise HTTPException(409, "This demo race already has 8 candidates.")
        extra = set(body.answers) - set(race["issues"])
        if extra:
            raise HTTPException(422, "Answer only the issues this office handles.")
        if not race["partisan"] and body.party != "Nonpartisan":
            raise HTTPException(
                422, "This is a nonpartisan race in Ohio. Choose Nonpartisan and list any party endorsement instead."
            )
        cid = f"self-{uuid.uuid4().hex[:8]}"
        race["candidates"].append(
            {
                "id": cid,
                "name": body.name.strip(),
                "party": body.party,
                "spending": body.spending,
                "endorsements": body.endorsements,
                "answers": {
                    i: (
                        body.answers[i].model_dump()
                        if i in body.answers
                        else {"stance": None, "reason": ""}
                    )
                    for i in race["issues"]
                },
                "source": "self",
            }
        )
        return {"candidate_id": cid, **snapshot(x_demo_session)}
