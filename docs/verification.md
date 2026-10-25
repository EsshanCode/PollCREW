# Verification

- Backend: `cd backend && uv run pytest -q` (19 tests: Census district parsing, FEC money matching and caching, statewide data integrity, agreement scale, labels, weighted score, money-blindness, demo story, Monte Carlo reproducibility and bounds, vote-for-two, levy lean, party crossing, ZIP lookup, API and candidate portal, session isolation).
- Frontend: `cd frontend && npm run typecheck && npm run build && npx playwright test` (voter flow with blind names hidden until reveal, ballot sheet, candidate portal end to end, mobile layout with no sideways scrolling).
- Not verified: real ballot data (demo uses real offices with fictional candidates).
