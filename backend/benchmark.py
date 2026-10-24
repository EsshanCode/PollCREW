import copy
import json
import os
from data import dataset
from engine import analytic_risk, budget_curve, contextual_quality, evaluate, solve


def benchmark():
    contextual_quality(("check_in", "accessibility"), ("check_in",))
    rows = []
    for jid, data in dataset().items():
        optimized = evaluate(data, solve(data))
        baseline = evaluate(data, solve(data, baseline=True))
        flat = solve(data, budget=0)
        ids = [
            a["worker_id"]
            for a in sorted(
                [a for a in optimized["assignments"] if a["role"] == "Check-in"],
                key=lambda a: (a["location_id"], a["worker_id"]),
            )[:3]
        ]
        recovery_data = copy.deepcopy(data)
        for w in recovery_data["workers"]:
            w["cancelled"] = w["id"] in ids
        recoveries = {}
        for name, plan in [("optimized", optimized), ("baseline", baseline)]:
            locked = [a for a in plan["assignments"] if a["worker_id"] not in ids]
            revised = evaluate(
                recovery_data,
                solve(recovery_data, locked=locked, baseline=name == "baseline"),
            )
            recoveries[name] = {
                "affected": len(plan["assignments"]) - len(locked),
                "replacements": len(revised["assignments"]) - len(locked),
                "runtime_ms": revised["runtime_ms"],
                "coverage": revised["coverage"],
                "risk_percent": revised["simulation"]["risk_percent"],
            }
        rows.append(
            {
                "jurisdiction": jid,
                "cancelled_ids": ids,
                "optimized": {
                    k: optimized[k]
                    for k in [
                        "coverage",
                        "surge_assigned",
                        "match_quality",
                        "runtime_ms",
                        "preparation_ms",
                        "simulation",
                        "status",
                    ]
                },
                "baseline": {
                    k: baseline[k]
                    for k in [
                        "coverage",
                        "surge_assigned",
                        "match_quality",
                        "runtime_ms",
                        "preparation_ms",
                        "simulation",
                        "status",
                    ]
                },
                "recovery": recoveries,
                "surge_budget": data["surge_budget"],
                "flat_staffing_risk_percent": analytic_risk(data, flat["assignments"]),
                "budget_curve": budget_curve(data, 8),
            }
        )
    return {
        "seed": 2026,
        "runs": 5000,
        "matching_mode": os.getenv("EMBEDDING_MODE", "sentence-transformers"),
        "rows": rows,
    }


if __name__ == "__main__":
    print(json.dumps(benchmark(), indent=2))
