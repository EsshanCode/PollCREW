import math
import os
import time
from functools import lru_cache
import numpy as np
from ortools.sat.python import cp_model
from data import SKILLS, distance_km


class PlanError(ValueError):
    pass


@lru_cache(maxsize=1)
def embedding_model():
    from sentence_transformers import SentenceTransformer

    try:
        return SentenceTransformer(
            os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
        )
    except Exception as exc:
        raise PlanError(
            "Contextual matching model could not load. Download the model first or restart with EMBEDDING_MODE=offline for the labeled exact-skill fallback."
        ) from exc


@lru_cache(maxsize=256)
def contextual_quality(skills, required):
    if os.getenv("EMBEDDING_MODE", "sentence-transformers") != "sentence-transformers":
        return len(set(skills) & set(required)) / max(1, len(required))
    model = embedding_model()
    texts = [
        "; ".join(SKILLS[s] for s in skills) or "No confirmed skills",
        "; ".join(SKILLS[s] for s in required) or "General assistance",
    ]
    vectors = model.encode(texts, normalize_embeddings=True)
    return max(0.0, float(vectors[0] @ vectors[1]))


def eligible(w, loc, req):
    return (
        not w["cancelled"]
        and w["available_start"] <= loc["start"]
        and w["available_end"] >= loc["end"]
        and (w["trained"] or not req["training"])
        and set(req["skills"]).issubset(w["confirmed_skills"])
        and distance_km(w, loc) <= w["max_travel_km"]
    )


def quality(w, loc, req):
    semantic = contextual_quality(
        tuple(sorted(w["confirmed_skills"])), tuple(sorted(req["skills"]))
    )
    return round(
        100
        * (
            0.7 * semantic
            + 0.3 * max(0, 1 - distance_km(w, loc) / max(1, w["max_travel_km"]))
        )
    )


def assignment(w, loc, req):
    km = round(distance_km(w, loc), 1)
    return {
        "worker_id": w["id"],
        "worker_name": w["name"],
        "location_id": loc["id"],
        "role": req["role"],
        "score": quality(w, loc, req),
        "travel_km": km,
        "reason": f"Confirmed: {', '.join(SKILLS[s] for s in req['skills']) or 'no required skills'}. Available {loc['start']}:00–{loc['end']}:00; {'training complete' if w['trained'] else 'training not required'}; {km} km straight-line travel within {w['max_travel_km']} km limit.",
    }


def solve(data, locked=None, baseline=False):
    preparation_started = time.perf_counter()
    locked = locked or []
    workers, locations = data["workers"], data["locations"]
    groups = [(loc, req) for loc in locations for req in loc["requirements"]]
    edges = {
        (i, k): assignment(w, loc, req)
        for i, w in enumerate(workers)
        for k, (loc, req) in enumerate(groups)
        if eligible(w, loc, req)
    }
    preparation_ms = round((time.perf_counter() - preparation_started) * 1000, 2)
    started = time.perf_counter()
    lock_edges = []
    for a in locked:
        found = [
            key
            for key, value in edges.items()
            if all(value[f] == a[f] for f in ["worker_id", "location_id", "role"])
        ]
        if not found:
            raise PlanError(
                f"Locked assignment for {a['worker_id']} is no longer eligible. Review the worker or reset the plan."
            )
        lock_edges.append(found[0])
    if len({i for i, k in lock_edges}) != len(lock_edges):
        raise PlanError("A worker has more than one locked assignment.")
    if baseline:
        selected = list(lock_edges)
        used = {i for i, k in selected}
        for minimum_pass in [True, False]:
            for k, (loc, req) in enumerate(groups):
                target = req["minimum"] if minimum_pass else req["desired"]
                count = sum(kk == k for ii, kk in selected)
                candidates = sorted(
                    [key for key in edges if key[1] == k and key[0] not in used],
                    key=lambda key: (-edges[key]["score"], workers[key[0]]["id"]),
                )
                for key in candidates[: max(0, target - count)]:
                    selected.append(key)
                    used.add(key[0])
        status = "GREEDY"
    else:
        model = cp_model.CpModel()
        x = {key: model.NewBoolVar(f"w{key[0]}g{key[1]}") for key in edges}
        for i in range(len(workers)):
            model.Add(sum(v for (ii, k), v in x.items() if ii == i) <= 1)
        for k, (loc, req) in enumerate(groups):
            count = sum(v for (i, kk), v in x.items() if kk == k)
            model.Add(count >= req["minimum"])
            model.Add(count <= req["desired"])
        for key in lock_edges:
            model.Add(x[key] == 1)
        priority = len(workers) * 100 + 1
        model.Maximize(
            sum((priority + edges[key]["score"]) * v for key, v in x.items())
        )
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 10
        solver.parameters.num_search_workers = 1
        solver.parameters.random_seed = 2026
        result = solver.Solve(model)
        if result not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            shortages = []
            for k, (loc, req) in enumerate(groups):
                count = sum(kk == k for i, kk in edges)
                if count < req["minimum"]:
                    shortages.append(
                        f"{loc['name']}, {req['role']}: {count} eligible for minimum {req['minimum']}"
                    )
            raise PlanError(
                "No feasible plan meets configured minimums and locks. "
                + (
                    "; ".join(shortages)
                    if shortages
                    else "Workers are shared across competing roles or locked elsewhere."
                )
                + ". Add qualified backups, reduce minimums, or adjust availability/travel requirements."
            )
        selected = [key for key, v in x.items() if solver.Value(v)]
        status = solver.StatusName(result)
    assignments = [edges[key] for key in selected]
    gaps = []
    for loc, req in groups:
        count = sum(
            a["location_id"] == loc["id"] and a["role"] == req["role"]
            for a in assignments
        )
        if count < req["desired"]:
            gaps.append(
                {
                    "location": loc["name"],
                    "role": req["role"],
                    "unfilled": req["desired"] - count,
                    "minimum_shortfall": max(0, req["minimum"] - count),
                }
            )
    needed = sum(req["desired"] for loc, req in groups)
    return {
        "assignments": assignments,
        "coverage": len(assignments) / max(1, needed),
        "needed": needed,
        "match_quality": round(float(np.mean([a["score"] for a in assignments])), 1)
        if assignments
        else 0,
        "preparation_ms": preparation_ms,
        "runtime_ms": round((time.perf_counter() - started) * 1000, 2),
        "gaps": gaps,
        "status": status,
        "approved": False,
        "minimums_met": all(g["minimum_shortfall"] == 0 for g in gaps),
        "locked_count": len(locked),
    }


def expected_wait(arrival, service, servers):
    if arrival == 0:
        return 0.0
    mu = 60 / service
    if servers == 0 or arrival >= servers * mu:
        return math.inf
    load = arrival / mu
    rho = load / servers
    terms = [load**k / math.factorial(k) for k in range(servers)]
    last = load**servers / math.factorial(servers) / (1 - rho)
    erlang_c = last / (sum(terms) + last)
    return 60 * erlang_c / (servers * mu - arrival)


def simulate(data, assignments, seed=2026, runs=5000):
    rng = np.random.default_rng(seed)
    attendance = {
        w["id"]: rng.random(runs) < w["attendance_probability"] for w in data["workers"]
    }
    locations = []
    any_risk = np.zeros(runs, dtype=bool)
    for loc in data["locations"]:
        ids = [
            a["worker_id"]
            for a in assignments
            if a["location_id"] == loc["id"] and a["role"] == "Check-in"
        ]
        counts = (
            np.sum([attendance[i] for i in ids], axis=0)
            if ids
            else np.zeros(runs, dtype=int)
        )
        lookup = np.array(
            [
                expected_wait(loc["arrival_per_hour"], loc["service_minutes"], c)
                for c in range(len(ids) + 1)
            ]
        )
        waits = lookup[counts.astype(int)]
        risk = waits > 30
        any_risk |= risk
        staffed_wait = expected_wait(
            loc["arrival_per_hour"], loc["service_minutes"], len(ids)
        )
        locations.append(
            {
                "id": loc["id"],
                "name": loc["name"],
                "check_in_workers": len(ids),
                "risk_percent": round(float(np.mean(risk) * 100), 2),
                "unstable_percent": round(float(np.mean(np.isinf(waits)) * 100), 2),
                "zero_staff_percent": round(float(np.mean(counts == 0) * 100), 2),
                "all_attend_expected_wait_minutes": round(staffed_wait, 2)
                if math.isfinite(staffed_wait)
                else None,
            }
        )
    return {
        "runs": runs,
        "seed": seed,
        "metric": "No-show scenarios with modeled expected wait over 30 minutes at any location",
        "risk_percent": round(float(np.mean(any_risk) * 100), 2),
        "locations": locations,
    }


def evaluate(data, plan):
    plan["simulation"] = simulate(data, plan["assignments"])
    return plan
