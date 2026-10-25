"""Real campaign money for federal races from the FEC's official API (api.open.fec.gov).

Set FEC_API_KEY (free from api.data.gov). Without it the public DEMO_KEY is used, which has
low rate limits. Results are cached for six hours. If the API fails, callers get None and the
app links to the FEC's own page instead of showing anything made up.
"""

import os
import re
import time

import httpx

URL = "https://api.open.fec.gov/v1/elections/"
PAGE = "https://www.fec.gov/data/elections/senate/OH/2026/"
_cache = {"at": 0.0, "data": None}
TTL = 6 * 3600


def _tokens(name):
    return set(re.findall(r"[a-z]+", name.lower()))


def senate_money(get=None, now=None):
    now = now or time.time()
    if _cache["data"] is not None and now - _cache["at"] < TTL:
        return _cache["data"]
    if now - _cache.get("failed_at", -1e9) < 300:
        return None
    get = get or httpx.get
    try:
        response = get(
            URL,
            params={
                "api_key": os.getenv("FEC_API_KEY") or "DEMO_KEY",
                "state": "OH",
                "office": "senate",
                "cycle": 2026,
                "election_full": "true",
                "per_page": 50,
            },
            timeout=8,
        )
        response.raise_for_status()
        rows = response.json().get("results", [])
    except (httpx.HTTPError, ValueError):
        _cache.update(at=now - TTL + 300, data=None)  # retry in five minutes, not every request
        _cache["failed_at"] = now
        return None
    data = {
        "rows": [
            {
                "fec_name": r.get("candidate_name", ""),
                "candidate_id": r.get("candidate_id"),
                "receipts": r.get("total_receipts"),
                "disbursements": r.get("total_disbursements"),
                "cash_on_hand": r.get("cash_on_hand_end_period"),
                "as_of": r.get("coverage_end_date"),
            }
            for r in rows
        ],
        "page": PAGE,
    }
    _cache.update(at=now, data=data)
    return data


def attach(candidates, money):
    """Match FEC rows ('LAST, FIRST M') to ballot names by last name plus first name."""
    if not money:
        return candidates
    out = []
    for cand in candidates:
        parts = cand["name"].lower().replace(".", "").split()
        first, last = parts[0], parts[-1]
        hit = next(
            (
                r
                for r in money["rows"]
                if last in _tokens(r["fec_name"]) and first in _tokens(r["fec_name"])
            ),
            None,
        )
        out.append({**cand, "money": hit})
    return out
