import copy
import os
import threading
import time
import uuid
from typing import Annotated
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, model_validator
from data import SKILLS, dataset
from engine import PlanError, budget_curve, coverage_stats, evaluate, solve, simulate
from extraction import extract

app = FastAPI(title="PollCREW synthetic demo", version="0.1.0")
sessions = {}
mutex = threading.RLock()
Session = Annotated[str, Header(alias="X-Demo-Session")]


class SkillUpdate(BaseModel):
    confirmed_skills: list[str]
    rejected_skills: list[str] = []
    experience: str = Field(default="", max_length=4000)
    trained: bool
    available_start: int = Field(ge=0, le=23)
    available_end: int = Field(ge=1, le=24)
    max_travel_km: float = Field(ge=0, le=500)

    @model_validator(mode="after")
    def validate_fields(self):
        if not set(self.confirmed_skills + self.rejected_skills).issubset(SKILLS):
            raise ValueError("Unknown skill")
        if set(self.confirmed_skills) & set(self.rejected_skills):
            raise ValueError("A rejected skill cannot be confirmed")
        if self.available_end <= self.available_start:
            raise ValueError("Availability end must be after start")
        return self


class Extraction(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


class Requirement(BaseModel):
    role: str
    desired: int = Field(ge=0, le=20)
    minimum: int = Field(ge=0, le=20)
    skills: list[str]
    training: bool

    @model_validator(mode="after")
    def valid(self):
        if self.minimum > self.desired or not set(self.skills).issubset(SKILLS):
            raise ValueError(
                "Minimum cannot exceed desired and skills must be recognized"
            )
        return self


class LocationUpdate(BaseModel):
    requirements: list[Requirement] = Field(min_length=1, max_length=3)
    arrival_per_hour: float = Field(ge=0, le=500)
    service_minutes: float = Field(gt=0, le=30)
    start: int = Field(ge=0, le=23)
    end: int = Field(ge=1, le=24)

    @model_validator(mode="after")
    def valid(self):
        roles = [r.role for r in self.requirements]
        if (
            set(roles) != {"Check-in", "Voter support", "Site lead"}
            or len(roles) != 3
            or self.end <= self.start
        ):
            raise ValueError("Provide all three distinct roles and an end after start")
        return self


class BudgetUpdate(BaseModel):
    surge_budget: int = Field(ge=0, le=20)


class Approval(BaseModel):
    revision: int


@app.exception_handler(PlanError)
def plan_error(request, exc):
    return JSONResponse(status_code=409, content={"detail": str(exc)})


def state(sid, jid=None):
    if sid not in sessions:
        raise HTTPException(404, "Demo session expired. Reload to start a fresh demo.")
    sessions[sid]["touched"] = time.monotonic()
    data = sessions[sid]["data"]
    if jid is None:
        return data
    if jid not in data:
        raise HTTPException(404, "Unknown jurisdiction")
    return data[jid]


def snapshot(sid):
    return copy.deepcopy(
        {
            "jurisdictions": list(state(sid).values()),
            "skills": SKILLS,
            "extraction_mode": os.getenv("EXTRACTION_MODE", "offline"),
            "matching_mode": os.getenv("EMBEDDING_MODE", "sentence-transformers"),
            "synthetic": True,
        }
    )


def require_draft(data):
    if data["plan"]:
        raise HTTPException(
            409,
            "Reset this demo before editing requirements or worker profiles so approved assignments stay consistent.",
        )


@app.get("/api/health")
def health():
    return {"status": "ok", "synthetic": True}


@app.post("/api/sessions")
def create_session():
    with mutex:
        for key in list(sessions):
            if time.monotonic() - sessions[key]["touched"] > 86400:
                del sessions[key]
        if len(sessions) >= 100:
            raise HTTPException(
                503, "Demo session capacity reached. Restart the local demo server."
            )
        sid = str(uuid.uuid4())
        sessions[sid] = {"data": dataset(), "touched": time.monotonic()}
        return {"session_id": sid, **snapshot(sid)}


@app.get("/api/state")
def get_state(x_demo_session: Session):
    with mutex:
        return snapshot(x_demo_session)


@app.post("/api/reset")
def reset(x_demo_session: Session):
    with mutex:
        state(x_demo_session)
        sessions[x_demo_session]["data"] = dataset()
        return snapshot(x_demo_session)


@app.post("/api/extract")
def extract_skills(body: Extraction, x_demo_session: Session):
    with mutex:
        state(x_demo_session)
    try:
        return extract(body.text)
    except ValueError as exc:
        raise HTTPException(503, str(exc))


@app.put("/api/jurisdictions/{jid}/workers/{wid}")
def update_worker(jid: str, wid: str, body: SkillUpdate, x_demo_session: Session):
    with mutex:
        data = state(x_demo_session, jid)
        require_draft(data)
        w = next((w for w in data["workers"] if w["id"] == wid), None)
        if w is None:
            raise HTTPException(404, "Worker not found")
        w.update(body.model_dump())
        return snapshot(x_demo_session)


@app.put("/api/jurisdictions/{jid}/locations/{lid}")
def update_location(jid: str, lid: str, body: LocationUpdate, x_demo_session: Session):
    with mutex:
        data = state(x_demo_session, jid)
        require_draft(data)
        loc = next((loc for loc in data["locations"] if loc["id"] == lid), None)
        if loc is None:
            raise HTTPException(404, "Location not found")
        loc.update(body.model_dump())
        return snapshot(x_demo_session)


@app.put("/api/jurisdictions/{jid}/budget")
def update_budget(jid: str, body: BudgetUpdate, x_demo_session: Session):
    with mutex:
        data = state(x_demo_session, jid)
        require_draft(data)
        data["surge_budget"] = body.surge_budget
        return snapshot(x_demo_session)


@app.post("/api/jurisdictions/{jid}/generate")
def generate(jid: str, x_demo_session: Session):
    with mutex:
        data = state(x_demo_session, jid)
        require_draft(data)
        plan = evaluate(data, solve(data))
        baseline = evaluate(data, solve(data, baseline=True))
        curve = budget_curve(data, max(8, data["surge_budget"]))
        data.update(
            plan=plan, baseline=baseline, curve=curve, revision=data["revision"] + 1
        )
        data["events"].append("Initial plan generated; ready for coordinator review.")
        return snapshot(x_demo_session)


@app.post("/api/jurisdictions/{jid}/approve")
def approve(jid: str, body: Approval, x_demo_session: Session):
    with mutex:
        data = state(x_demo_session, jid)
        if (
            not data["plan"]
            or body.revision != data["revision"]
            or data["plan"].get("disrupted")
        ):
            raise HTTPException(
                409,
                "The plan changed or has unresolved cancellations. Review the latest revision before approval.",
            )
        data["plan"]["approved"] = True
        data["events"].append(f"Coordinator approved revision {data['revision']}.")
        return snapshot(x_demo_session)


@app.post("/api/jurisdictions/{jid}/cancel")
def cancel(jid: str, x_demo_session: Session):
    with mutex:
        data = state(x_demo_session, jid)
        if not data["plan"] or not data["plan"]["approved"] or data["impact"]:
            raise HTTPException(
                409,
                "Approve the initial plan first. Cancellation demo runs once per reset.",
            )
        before = copy.deepcopy(data["plan"])
        check_in = [a for a in before["assignments"] if a["role"] == "Check-in"]
        ordered = sorted(check_in, key=lambda a: (a["location_id"], a["worker_id"]))
        ids = [a["worker_id"] for a in ordered[:3]]
        if len(ids) < 3:
            raise HTTPException(
                409, "This scenario requires at least three assigned check-in workers."
            )
        for w in data["workers"]:
            if w["id"] in ids:
                w["cancelled"] = True
        remaining = [a for a in before["assignments"] if a["worker_id"] not in ids]
        data["before"] = before
        data["plan"]["assignments"] = remaining
        data["plan"].update(
            approved=False,
            disrupted=True,
            coverage=coverage_stats(data, remaining)["filled"] / before["needed"],
            surge_assigned=coverage_stats(data, remaining)["surge_assigned"],
            simulation=simulate(data, remaining),
        )
        data["plan"]["gaps"] = []
        for loc in data["locations"]:
            for req in loc["requirements"]:
                count = sum(
                    a["location_id"] == loc["id"] and a["role"] == req["role"]
                    for a in remaining
                )
                if count < req["desired"]:
                    data["plan"]["gaps"].append(
                        {
                            "location": loc["name"],
                            "role": req["role"],
                            "unfilled": req["desired"] - count,
                            "minimum_shortfall": max(0, req["minimum"] - count),
                        }
                    )
        data["plan"]["minimums_met"] = all(
            g["minimum_shortfall"] == 0 for g in data["plan"]["gaps"]
        )
        data["plan"]["status"] = "DISRUPTED"
        data["plan"]["match_quality"] = (
            round(sum(a["score"] for a in remaining) / len(remaining), 1)
            if remaining
            else 0
        )
        data["impact"] = {
            "cancelled_ids": ids,
            "lost_assignments": 3,
            "preserved": len(remaining),
            "before_risk": before["simulation"]["risk_percent"],
            "after_risk": data["plan"]["simulation"]["risk_percent"],
            "recovered": None,
        }
        data["revision"] += 1
        data["events"].append(
            "Three synthetic check-in workers cancelled. Remaining approved assignments are locked."
        )
        return snapshot(x_demo_session)


@app.post("/api/jurisdictions/{jid}/recover")
def recover(jid: str, x_demo_session: Session):
    with mutex:
        data = state(x_demo_session, jid)
        if not data["plan"] or not data["plan"].get("disrupted"):
            raise HTTPException(409, "Run the cancellation scenario before recovery.")
        locked = data["plan"]["assignments"]
        revised = evaluate(data, solve(data, locked=locked))
        ids = data["impact"]["cancelled_ids"]
        base_locked = [
            a for a in data["baseline"]["assignments"] if a["worker_id"] not in ids
        ]
        baseline_recovery = evaluate(
            data, solve(data, locked=base_locked, baseline=True)
        )
        baseline_affected = len(data["baseline"]["assignments"]) - len(base_locked)
        data["impact"].update(
            recovered=len(revised["assignments"]) - len(locked),
            baseline_affected=baseline_affected,
            baseline_recovered=len(baseline_recovery["assignments"]) - len(base_locked),
            baseline_recovery_ms=baseline_recovery["runtime_ms"],
        )
        data["plan"] = revised
        data["revision"] += 1
        data["events"].append("Backup plan generated. Coordinator approval required.")
        return snapshot(x_demo_session)
