# Blind Ballot

**Vote on policies, not ad budgets. · HackOHI/O 2026**



## What's real and what's demo

| Data | Source | Coverage |
|---|---|---|
| Your districts: county, city or township, school district, Ohio House, Ohio Senate, U.S. House | [U.S. Census Bureau Geocoder](https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html) (2026 state legislative districts, 120th Congressional districts) | **Real**, any Ohio street address |
| Statewide races and candidates (U.S. Senate, Governor, Attorney General, Auditor, Secretary of State, Treasurer, two Supreme Court seats) | [Wood County Board of Elections certified list](https://boe.woodcountyohio.gov/DocumentCenter/View/1006/Candidate-List) (Aug 26, 2026), cross-checked with [Hamilton County's](https://votehamiltoncountyohio.gov/wp-content/uploads/2026/08/November-2026-Candidate-Profile-1-3.pdf) (Aug 21, 2026) | **Real**, every Ohio ballot |
| U.S. Senate campaign money | [FEC API](https://api.open.fec.gov/developers/) (`FEC_API_KEY`) | **Real**, hidden behind a toggle |
| Local races with candidates, positions, endorsements and spending | Fictional demo on real offices | Delaware and Franklin County |
| Real candidates' positions | Only from candidates themselves, via the portal | None yet: shown as "No candidate has answered yet" |

Local candidate lists for Ohio's 88 counties are published separately by each county board of elections (no statewide feed exists, and Google's Civic API has no Ohio contests for this election), so the app links to the [Secretary of State's county board directory](https://www.ohiosos.gov/elections/elections-officials/county-boards-of-elections-directory/) instead of guessing. Blind Ballot never invents positions for real people.

## The problem

- **Money buys name recognition.** In U.S. House races, the candidate who spent more won 91% of the time over four election cycles ([Sherwood News, OpenSecrets data](https://sherwood.news/world/election-winners-spend-big-to-win)). Incumbency explains part of that, but the pattern is the point.
- **Local races have almost no information.** 213 U.S. counties have no local news source, and about 50 million Americans have limited access to local news ([Medill State of Local News 2025](https://www.medill.northwestern.edu/news/2025/news-deserts-hit-new-high-and-50-million-have-limited-access-to-local-news-study-finds.html)).
- **So voters guess or skip.** In Knox County, Ohio in 2024, the state school board race drew about 10,000 fewer votes than the presidential race and split nearly 50/50 in a county that votes about 70/30. It was the only race without party labels ([Kenyon College CSAD](https://www.kenyon.edu/offices-and-services/center-for-the-study-of-american-democracy/associates/voter-drop-off-in-non-partisan-races/)).

The people who set property taxes, run schools and fix roads end up chosen by yard signs, ad money and party labels instead of policy.

## How it works

1. **Your ballot.** Enter an address or ZIP. Blind Ballot finds your county's local races and ballot issues.
2. **Your priorities.** Answer one plain-language local question per screen (school levies, taxes versus services, housing, growth, roads, public safety, parks and libraries) and say how much each matters.
3. **Blind match.** Each race lists "Candidate A, B, C" ranked by policy agreement, with each candidate's reasons in their own words. No names, parties or money.
4. **The reveal.** Names, party, endorsements and spending appear, with the punchline: "Your best match spent $4.1K. The biggest spender, at $86.4K, matched you 52%."
5. **My Blind Ballot.** A printable sheet with your matches for every race and your lean on each levy. Ohio lets voters bring personal notes into the booth.

**Candidate portal (`/candidates`).** Candidates answer the same questions in the same format, with a 160-character reason for each. Everyone gets the same space: no photos, no ads, no paid placement. Spending is shown only at the reveal (in a real launch it comes from campaign finance reports, not the candidate).

## Money-blind by design

- The matching code receives **only stated positions**. Spending, party and endorsements are attached afterwards for the reveal, and a unit test proves that changing them cannot change any match.
- Candidates get **shuffled blind letters**, so "Candidate A" is never simply the first or richest.
- **No ads, no sponsored placement**, and nothing is ranked by fundraising.
- Voter answers are used for one response and **never stored**. The optional "usual party" question is not used for matching; it only lets the reveal say when a match crosses party lines.
- Questions are **local service trade-offs**, not culture-war topics, and the site never calls a candidate good or bad.

## The math

- **Match:** weighted agreement over the issues each office actually handles: `agreement = 1 − |voter − candidate| / 4` on a shared −2..2 scale, weighted by the voter's own importance (1–3). Unanswered issues are skipped and shown as "didn't answer."
- **Confidence (Monte Carlo):** people are not perfectly sure of their own answers, so each match is rerun 2,000 times with small random changes to the voter's stances (normal, σ = 0.6) and weights (log-normal, σ = 0.35). Blind Ballot reports how often each candidate stays in the voter's top picks ("your best match in 84% of 2,000 what-ifs") and flags close calls below 60%.
- **"Vote for 2" races** report membership in the top two.
- **Ballot issues** (levies) have no candidates to hide; Blind Ballot shows how the voter's own answers lean (yes, no or mixed).

## Run locally

Requirements: Python 3.12+, `uv`, Node.js 20.9+.

```sh
./start.sh
```

Or in two terminals:

```sh
cd backend && uv sync --frozen && uv run uvicorn main:app --host 127.0.0.1 --port 8000
cd frontend && npm ci && npm run build && npm run start
```

Open <http://127.0.0.1:3000>. Next.js proxies `/api` to FastAPI (set `BACKEND_URL` to point elsewhere). API docs: <http://127.0.0.1:8000/docs>.

## Deploy (Render + Vercel)

- **API on Render:** New → Blueprint → this repo. `render.yaml` builds `backend/` from `requirements-cloud.txt`. Add `FEC_API_KEY` (free from api.data.gov) under Environment for Senate money; without it the FEC's low-limit `DEMO_KEY` is used.
- **Site on Vercel:** import the repo, Root Directory `frontend`, environment variable `BACKEND_URL` = the Render URL.
- Every push to `main` redeploys both. The free Render plan sleeps after 15 idle minutes; the site keeps retrying while it wakes.

## Tests

```sh
cd backend && uv run pytest -q          # matching, money-blindness, Monte Carlo, API, portal
cd frontend && npx playwright test      # voter flow, candidate portal, mobile layout
```

## Limits

- Demo ballots for two Ohio counties with fictional candidates; ZIP codes that span counties map to one county.
- Candidate positions are self-reported. A real launch needs identity verification for candidates, and source links for any position not entered by the candidate.
- Self-reported answers can be strategic. Showing each candidate's reasons in their own words, side by side, makes vague or evasive answers visible.
