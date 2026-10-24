# Verification record

Checked locally on October 24, 2026, on macOS with Python 3.12, Node 24, Next.js 16, OR-Tools CP-SAT, and NumPy. Exact installed dependency resolutions are committed in `backend/uv.lock` and `frontend/package-lock.json`.

## Completed

- Backend: 15 passing tests covering all three jurisdictions, eligibility constraints, rejected skills, full-shift availability, training, travel limits, cancellation exclusion, locked assignment preservation, insufficient backups, failure-state preservation, soft desired gaps versus hard minimums, seed repeatability, zero-capacity and overloaded queues, valid greedy baseline, extraction evidence and negation, invalid AI evidence, stale approval rejection, session isolation, and reset.
- Frontend: production build and strict TypeScript check.
- Contextual matching: downloaded and ran the actual MiniLM sentence-transformers model locally, then evaluated every jurisdiction and cancellation recovery. `benchmark-results.json` contains measured results rather than illustrative targets. Assignment-selection timings exclude model and candidate preparation, which are recorded separately to avoid charging a cold model load to only the first algorithm.
- Interactive browser verification: national overview, state filter, worker experience extraction with quoted evidence, confirmation and rejection, profile save, 28 Wake assignments and reasons, initial approval, three cancellations, 25 remaining assignments, recovery to 28, exact preservation of all 25 unaffected table rows, revised approval, evaluation, reset, invalid requirement rejection, corrected requirement save, and 390-pixel mobile layout without horizontal document overflow.
- Visual verification found and corrected a basemap dependency that required a key. National state geometry is now bundled; local street maps use OpenStreetMap. A reset bug involving retained unsaved form state was corrected with an explicit editor reset generation. The full cancellation flow was also verified with actual sentence-transformers matching: 25 locked rows remained identical after recovery to 28.

## Browser automation and remaining limits

The macOS execution sandbox initially denied Chromium’s Mach-port registration before either automated test body ran. Interactive verification proceeded through the in-app browser. The same committed test suite subsequently ran successfully on the private repository’s Linux GitHub Actions runner: **both end-to-end tests passed**, alongside all 15 backend tests, the production build, and TypeScript checks. See [the verification run](https://github.com/EsshanCode/PollCREW/actions/runs/40126543618). The browser suite uses the labeled offline matcher/extractor for repeatability; actual contextual matching was separately verified locally, including cancellation recovery. The final 390-pixel layout had no horizontal overflow, and reset restored an unsaved minimum-count edit from 9 to the seeded value 2.

Live OpenAI extraction was not called because no API key was supplied. Its evidence-validation failure path is tested with a synthetic mocked provider response. The default extraction mode is honestly labeled offline keyword extraction. Sentence-transformers is a separate local model and was tested with actual weights.

No multi-user authentication, durable database, deployment, empirical queue calibration, legal assessment, or production load test was performed. Data and sessions are intentionally synthetic and ephemeral. No claim is made that simulated wait metrics predict a real election.

The PDF mentioned in the request was unavailable. Only the pasted detailed specification was implemented; no additional PDF benchmarks are claimed.
