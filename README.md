# PollCREW

**Coordinated Routing of Election Workers · Hack/OHIO 2026**

> **Full AI assistance disclosure:** This prototype was designed, implemented, documented, and tested with substantial generative AI assistance through OpenAI Codex (Astra). AI assistance includes the Python backend, optimization and simulation implementation, React interface, synthetic data generator, tests, documentation, and demo preparation. The risk-aware staffing update (extra-staff budget, exact line-risk objective, trade-off chart), the poll worker view, and the real polling-place import were made with Claude (Anthropic) assistance. The commit history records individual file changes; it is not evidence of unaided human authorship. Human review is necessary before use beyond this hackathon demonstration.

PollCREW is a national, nonpartisan staffing prototype. Choose a synthetic jurisdiction, confirm a worker’s skills, generate an explainable assignment plan that places a limited number of extra check-in workers where they cut long-line risk the most, simulate three cancellations, recover with backups while preserving unaffected approved assignments, and approve the revision.

**All workers, locations, precinct associations, staffing requirements, and demand estimates are synthetic. There is no nationwide live-data coverage, legal certification, compliance determination, or real-world election deployment. No party affiliation is collected.** Real jurisdiction names provide familiar geographic context only.

## Run locally

Requirements: Python 3.12, Node.js 20.9+ (Node 24 tested), and `uv`. Keep both services bound to loopback. This is an unauthenticated, single-process local demo, not a production service.

Terminal 1, from the repository root:

```sh
cd backend
uv sync --frozen
uv run uvicorn main:app --host 127.0.0.1 --port 8000
```

Terminal 2:

```sh
cd frontend
npm ci
npm run build
npm run start
```

Open <http://127.0.0.1:3000>. For frontend development, use `npm run dev` instead. Next.js proxies `/api` to FastAPI on port 8000. API documentation is at <http://127.0.0.1:8000/docs>.

The default matching mode uses `sentence-transformers/all-MiniLM-L6-v2` locally. The first assignment generation downloads model weights from Hugging Face and can take longer. Prewarm before presenting:

```sh
cd backend
uv run python -c 'from engine import contextual_quality; print(contextual_quality(("check_in", "accessibility"), ("check_in",)))'
```

For an entirely offline calculation demo, start the backend with `EMBEDDING_MODE=offline`. This uses explicitly labeled exact-skill overlap instead of embeddings. Download dependencies and the model beforehand for contextual matching without network access. The national map uses bundled state boundaries; local street tiles require Internet access. The site list and assignment engine do not depend on tile availability.

## Poll worker view

Open <http://127.0.0.1:3000/worker>, or use **Poll worker view** in the coordinator sidebar so both views share one demo session. It is built for poll workers of every background, most of whom are 61 or older:

- One question per screen with a step counter and Back link, following the GOV.UK "one thing per page" pattern.
- 20 px base text with a **Larger text** toggle (24 px), 56–60 px tap targets, high-contrast colors, and icons that always carry a text label.
- An **Español** toggle on every screen; preferences are remembered on the device.
- Plain-language skill cards ("Check voters in", "Help voters with disabilities"). Suggested skills quote the worker's own sentence, and nothing is selected until the worker taps it. Offline extraction understands everyday wording such as "front desk" or "nurse" and simple Spanish sentences.
- After the plan exists, the worker sees one card: date and arrival time, polling place and address, job in plain words, team lead, hours, a **Get directions** link, and an **I can't make it** button. That button (after a confirmation screen) removes them from the approved plan, locks everyone else, and puts the coordinator in recovery mode with updated line risk.
- Travel limits are asked in miles and stored in kilometers.

Spanish text was drafted with AI assistance and should be reviewed by a native speaker before real use. Workers sign in by picking a sample name in this demo; a real launch would use a link sent by text message.

## Real polling places

The national overview can import real polling places through the [Google Civic Information API](https://developers.google.com/civic-information) `voterinfo` endpoint, which returns the official Election Day polling location for an address from the Voting Information Project. Each unique location with coordinates becomes a site in a new jurisdiction (up to eight). Workers, arrival rates, and staffing requirements remain synthetic and labeled as such.

1. Create a free API key in the Google Cloud console and enable the Civic Information API.
2. Start the backend with the key: `GOOGLE_CIVIC_API_KEY=your-key uv run uvicorn main:app --host 127.0.0.1 --port 8000`.
3. On the national overview, keep or edit the sample Columbus addresses and click **Find polling places**.

Results depend on the election being loaded in the Voting Information Project; residential addresses work best. The key stays on the server and is never sent to the browser. Imported jurisdictions survive **Reset demo**.

## Runtime AI, separately from development assistance

- **Contextual matching:** Sentence-transformers compares descriptions of confirmed skills with required skills. Raw experience and rejected or unconfirmed skills do not enter the matcher. Exact required-skill membership remains a hard eligibility rule; similarity cannot override it.
- **Extraction:** `EXTRACTION_MODE=offline` is the default: a deterministic keyword demonstration, clearly labeled as not an LLM call. It suggests exact supporting text and conservatively skips sentences with simple negation. It is limited and can miss nuanced statements.
- **Optional live extraction:** Set `EXTRACTION_MODE=openai` and server-side `OPENAI_API_KEY`; optionally set `EXTRACTION_MODEL` (default `gpt-4.1-mini`). Only the submitted experience text and skill taxonomy are sent to OpenAI. Structured output is validated against the taxonomy and supporting quotes must appear verbatim in the input. Model errors do not silently change skills. Worker confirmation is always required. Live provider behavior requires separate testing with your own key.
- **Assignment decisions:** Explicit eligibility code and OR-Tools CP-SAT make assignments. An LLM never creates or approves an assignment.

Environment examples are in `.env.example`. Variables must be exported into the backend process; the app does not automatically load a `.env` file. Never put API keys in `NEXT_PUBLIC_*`, browser code, screenshots, logs, or Git. Optional integration follows the [official structured-output documentation](https://developers.openai.com/api/docs/guides/structured-outputs).

## Data and operational requirements

Seed 2026 produces 150 workers: 50 each in Wake County, North Carolina; Dane County, Wisconsin; and Maricopa County, Arizona. Each jurisdiction has four physical locations, each associated with two distinct precinct IDs. Wake locations request four check-in workers, two voter-support workers, and one site lead (28 total). Dane requests one voter-support worker per site (24 total). Maricopa requests five check-in workers per site (32 total), and its Central Library support role additionally requires confirmed Spanish assistance. Each jurisdiction also has an **extra check-in staff budget** of six workers beyond the desired counts, editable on the Requirements tab before generating a plan. Remaining eligible workers are available as backups. These are synthetic operational choices, not jurisdictional rules.

Workers have confirmed skills, explicit availability, training status, a travel limit, and an attendance assumption. Some are intentionally unavailable for the full shift or untrained. Coordinators can edit minimum and desired counts, required skills, training requirements, shift hours, and queue assumptions before generating a plan. Profiles also expose availability, training, and travel limits. Generated plans freeze these inputs; reset before changing them.

The generator and distance adapter are in `backend/data.py`. Geography, operational configuration, and precinct identifiers are plain records, with no Ohio-specific GIS or transit dependency. Travel is Haversine straight-line distance in kilometers, not road travel or transit time. Replace `distance_km` and the dataset adapter when integrating a validated source. No legal rules are encoded.

Export exact reproducible fixture data:

```sh
cd backend
uv run python export_demo.py > demo-data.json
```

## Optimization and recovery

The solver enforces one assignment per worker, full-shift availability, training where required, all required confirmed skills, travel limits, configured role minimums, desired counts for voter support and site leads, and the extra check-in staff budget. Its objective is lexicographic through weights: first fill desired positions, then **minimize the chance that any site's modeled wait exceeds 30 minutes**, then avoid extra workers that do not reduce that risk, then maximize match quality. Quality combines 70% confirmed-skill contextual similarity and 30% travel proximity.

For each site and each possible check-in count, the solver precomputes the exact probability of a long line: a Poisson-binomial distribution over which assigned workers attend, combined with the M/M/c expected wait. CP-SAT chooses one count per site, so the cost of `-log(1 - risk)` summed across sites is minimized; with independent sites that is exactly the chance that at least one site has a long line. The 5,000-run Monte Carlo below checks the same figure independently. The solver uses one search worker, seed 2026, and a ten-second limit. A feasible result need not be proven optimal; the returned status distinguishes these cases.

Infeasible requests return actionable errors and do not overwrite the previous plan. An unreachable desired count can produce an explicitly reported gap if all hard minimums remain satisfied. No minimum is silently relaxed.

Approve the initial plan to run the cancellation scenario. Three assigned check-in workers at the first location cancel. They remain unavailable through recovery. Every unaffected approved assignment is locked; backups can fill vacancies without moving those workers. A new revision must be reviewed and approved. Stale revision approvals are rejected. Cancellation failure and recovery failure preserve current state. Reset reliably restores the original seed and clears approvals and cancellations.

Sessions are isolated by a random ID stored in browser session storage, kept in backend memory, and expire after 24 hours of inactivity. Restarting the backend clears all sessions. This is not authentication or durable storage. Use one backend process, one uvicorn worker, and synthetic data only.

## Queue simulation and evaluation

Every evaluated plan runs **5,000 seeded no-show scenarios**. Each worker independently attends with probability 0.92; a shared worker-by-scenario attendance matrix is generated in stable order for comparisons. Only attending workers assigned to **Check-in** count as service stations.

The queue model is M/M/c: constant Poisson arrivals, independent exponential service times, and a steady-state expected wait. Mean service time defaults to 2.5 minutes. Wake arrival rates are 64/70/78/86 per hour; Dane 66/69/72/75; Maricopa 86/89/92/95. Configurable values are used directly. Zero check-in staff with positive arrivals and arrival rates greater than or equal to service capacity are unstable with infinite modeled wait. JSON uses `null` for an all-attend wait with no finite steady-state value; the UI explains it. Zero demand yields zero expected wait.

The headline metric is **the percentage of no-show scenarios with modeled expected wait over 30 minutes at any location**, including unstable queues. Every simulation also reports the exact analytic value of the same quantity; the two agree within sampling error. Site cards show the corresponding site-level metric, unstable-scenario share, zero-staff share, and expected wait if all assigned workers attend. This is **not an individual voter’s probability of waiting more than 30 minutes**. It is not a finite-day simulation, and it omits breaks, changing arrival patterns, correlated no-shows, and empirical calibration. High risks are reported honestly; no risk targets are hardcoded.

The baseline is a genuine greedy assignment: visit locations and roles in fixed order, fill hard minimums before desired positions, then hand out the same extra check-in budget one worker per location in turn, taking the highest-scoring remaining eligible worker each time. Both methods use identical data, scores, eligibility rules, budgets, and simulation seeds. The Evaluation tab also plots risk against the extra-staff budget (0 to 8) for both methods. The greedy method can fail hard minimums because it does not globally reserve scarce skills; the dashboard explicitly reports that outcome. Coverage, mean match score, runtime, and queue risk are measured. Recovery applies identical cancelled worker IDs to both plans and preserves each plan’s unaffected assignments; affected counts can differ and are displayed.

Measured results in `docs/benchmark-results.json` (offline matching mode, seed 2026, exact risk):

| Jurisdiction | No extra staff | Even spread of 6 extra | PollCREW with 6 extra |
| --- | --- | --- | --- |
| Wake County | 52.2% | 10.7% | 2.6% |
| Dane County | 52.2% | 10.7% | 2.6% |
| Maricopa County | 44.3% | 8.7% | 2.8% |

After three check-in cancellations at one site, recovery with the remaining budget keeps PollCREW at 2.2–2.9% (Monte Carlo) versus 9.4–11.4% for the even-spread baseline.

Run reproducible comparisons:

```sh
cd backend
uv run python benchmark.py > benchmark.json
```

Assignment-selection runtime excludes eligibility and score preparation, model loading, and queue simulation. Eligibility and score preparation time is reported separately; first-use model loading and cache state affect that preparation metric. Both algorithms therefore compare selection on prepared candidate sets. Results are observations of this synthetic dataset, not general performance claims.

## Verification

```sh
cd backend
uv run pytest -q
cd ../frontend
npm run build
npm run typecheck
npx playwright install chromium
npm test
```

Start the backend before running browser tests. The browser suite starts the frontend production server if needed. Tests cover the poll worker flow (questions, Spanish toggle, assignment card, "I can't make it"), polling-place import with simulated API responses, constraints, rejected-skill exclusion, cancellations, locked assignments, insufficient backups, repeatable simulations, exact-versus-Monte-Carlo risk agreement, budget limits, risk-aware allocation beating even spread in every jurisdiction, recovery restoring low risk, stale approvals, session isolation, reset, worker confirmation, assignment review, budget editing, and mobile requirements validation. See `docs/verification.md` for the actual checks completed and environmental limitations.

Code is intentionally free of explanatory comments; design explanations live here and in documentation. Build-generated files may contain framework-generated notices and are excluded from Git.

## Demo and delivery

Follow `docs/demo-script.md` for a presentation under three minutes. This is a local prototype; no public deployment is part of the project.

## Map attribution

Bundled state geometry is derived from `us-atlas` 3.x, which redistributes US Census Bureau cartographic boundaries. See <https://github.com/topojson/us-atlas>. It is reference geography, not voting-district data. Local maps optionally request tiles from OpenStreetMap and display contributor attribution. Synthetic voting locations are not actual election sites.
