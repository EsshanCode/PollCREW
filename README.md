# PollCREW

**Coordinated Routing of Election Workers · Hack/OHIO 2026**

> **Full AI assistance disclosure:** This prototype was designed, implemented, documented, and tested with substantial generative AI assistance through OpenAI Codex (Astra). AI assistance includes the Python backend, optimization and simulation implementation, React interface, synthetic data generator, tests, documentation, and demo preparation. The commit history records individual file changes; it is not evidence of unaided human authorship. Human review is necessary before use beyond this hackathon demonstration.

PollCREW is a national, nonpartisan staffing prototype. Choose a synthetic jurisdiction, confirm a worker’s skills, generate an explainable assignment plan, simulate three cancellations, recover with backups while preserving unaffected approved assignments, and approve the revision.

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

## Runtime AI, separately from development assistance

- **Contextual matching:** Sentence-transformers compares descriptions of confirmed skills with required skills. Raw experience and rejected or unconfirmed skills do not enter the matcher. Exact required-skill membership remains a hard eligibility rule; similarity cannot override it.
- **Extraction:** `EXTRACTION_MODE=offline` is the default: a deterministic keyword demonstration, clearly labeled as not an LLM call. It suggests exact supporting text and conservatively skips sentences with simple negation. It is limited and can miss nuanced statements.
- **Optional live extraction:** Set `EXTRACTION_MODE=openai` and server-side `OPENAI_API_KEY`; optionally set `EXTRACTION_MODEL` (default `gpt-4.1-mini`). Only the submitted experience text and skill taxonomy are sent to OpenAI. Structured output is validated against the taxonomy and supporting quotes must appear verbatim in the input. Model errors do not silently change skills. Worker confirmation is always required. Live provider behavior requires separate testing with your own key.
- **Assignment decisions:** Explicit eligibility code and OR-Tools CP-SAT make assignments. An LLM never creates or approves an assignment.

Environment examples are in `.env.example`. Variables must be exported into the backend process; the app does not automatically load a `.env` file. Never put API keys in `NEXT_PUBLIC_*`, browser code, screenshots, logs, or Git. Optional integration follows the [official structured-output documentation](https://developers.openai.com/api/docs/guides/structured-outputs).

## Data and operational requirements

Seed 2026 produces 150 workers: 50 each in Wake County, North Carolina; Dane County, Wisconsin; and Maricopa County, Arizona. Each jurisdiction has four physical locations, each associated with two distinct precinct IDs. Wake locations request four check-in workers, two voter-support workers, and one site lead (28 total). Dane requests one voter-support worker per site (24 total). Maricopa requests five check-in workers per site (32 total), and its Central Library support role additionally requires confirmed Spanish assistance. Remaining eligible workers are available as backups. These are synthetic operational choices, not jurisdictional rules.

Workers have confirmed skills, explicit availability, training status, a travel limit, and an attendance assumption. Some are intentionally unavailable for the full shift or untrained. Coordinators can edit minimum and desired counts, required skills, training requirements, shift hours, and queue assumptions before generating a plan. Profiles also expose availability, training, and travel limits. Generated plans freeze these inputs; reset before changing them.

The generator and distance adapter are in `backend/data.py`. Geography, operational configuration, and precinct identifiers are plain records, with no Ohio-specific GIS or transit dependency. Travel is Haversine straight-line distance in kilometers, not road travel or transit time. Replace `distance_km` and the dataset adapter when integrating a validated source. No legal rules are encoded.

Export exact reproducible fixture data:

```sh
cd backend
uv run python export_demo.py > demo-data.json
```

## Optimization and recovery

The solver enforces one assignment per worker, full-shift availability, training where required, all required confirmed skills, travel limits, and configured role minimums and maximum desired counts. It first maximizes filled desired positions, then match quality. Quality combines 70% confirmed-skill contextual similarity and 30% travel proximity. The solver uses one search worker, seed 2026, and a ten-second limit. A feasible result need not be proven optimal; the returned status distinguishes these cases.

Infeasible requests return actionable errors and do not overwrite the previous plan. An unreachable desired count can produce an explicitly reported gap if all hard minimums remain satisfied. No minimum is silently relaxed.

Approve the initial plan to run the cancellation scenario. Three assigned check-in workers at the first location cancel. They remain unavailable through recovery. Every unaffected approved assignment is locked; backups can fill vacancies without moving those workers. A new revision must be reviewed and approved. Stale revision approvals are rejected. Cancellation failure and recovery failure preserve current state. Reset reliably restores the original seed and clears approvals and cancellations.

Sessions are isolated by a random ID stored in browser session storage, kept in backend memory, and expire after 24 hours of inactivity. Restarting the backend clears all sessions. This is not authentication or durable storage. Use one backend process, one uvicorn worker, and synthetic data only.

## Queue simulation and evaluation

Every evaluated plan runs **5,000 seeded no-show scenarios**. Each worker independently attends with probability 0.92; a shared worker-by-scenario attendance matrix is generated in stable order for comparisons. Only attending workers assigned to **Check-in** count as service stations.

The queue model is M/M/c: constant Poisson arrivals, independent exponential service times, and a steady-state expected wait. Mean service time defaults to 2.5 minutes. Wake arrival rates are 74/77/80/83 per hour; Dane 66/69/72/75; Maricopa 86/89/92/95. Configurable values are used directly. Zero check-in staff with positive arrivals and arrival rates greater than or equal to service capacity are unstable with infinite modeled wait. JSON uses `null` for an all-attend wait with no finite steady-state value; the UI explains it. Zero demand yields zero expected wait.

The headline metric is **the percentage of no-show scenarios with modeled expected wait over 30 minutes at any location**, including unstable queues. Site cards show the corresponding site-level metric, unstable-scenario share, zero-staff share, and expected wait if all assigned workers attend. This is **not an individual voter’s probability of waiting more than 30 minutes**. It is not a finite-day simulation, and it omits breaks, changing arrival patterns, correlated no-shows, and empirical calibration. High risks are reported honestly; no risk targets are hardcoded.

The baseline is a genuine greedy assignment: visit locations and roles in fixed order, fill hard minimums before desired positions, and take the highest-scoring remaining eligible worker each time. Both methods use identical data, scores, eligibility rules, and simulation seeds. The greedy method can fail hard minimums because it does not globally reserve scarce skills; the dashboard explicitly reports that outcome. Coverage, mean match score, runtime, and queue risk are measured. Recovery applies identical cancelled worker IDs to both plans and preserves each plan’s unaffected assignments; affected counts can differ and are displayed.

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

Start the backend before running browser tests. The browser suite starts the frontend production server if needed. Tests cover constraints, rejected-skill exclusion, cancellations, locked assignments, insufficient backups, repeatable simulations, stale approvals, session isolation, reset, worker confirmation, assignment review, and mobile requirements validation. See `docs/verification.md` for the actual checks completed and environmental limitations.

Code is intentionally free of explanatory comments; design explanations live here and in documentation. Build-generated files may contain framework-generated notices and are excluded from Git.

## Demo and delivery

Follow `docs/demo-script.md` for a presentation under three minutes. The repository remains private. Public deployment, permission changes, and hackathon submission require the owner’s approval. No submission or public deployment is part of this local prototype.

The request referred to an attached PDF, but only the detailed pasted instructions were available during this implementation. Those instructions are the implemented specification. Additional PDF comparisons have not been claimed or fabricated.

## Map attribution

Bundled state geometry is derived from `us-atlas` 3.x, which redistributes US Census Bureau cartographic boundaries. See <https://github.com/topojson/us-atlas>. It is reference geography, not voting-district data. Local maps optionally request tiles from OpenStreetMap and display contributor attribution. Synthetic voting locations are not actual election sites.
