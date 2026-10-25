# Blind Ballot

**Vote on policies, not ad budgets**

Blind Ballot is a nonpartisan voter guide for Ohio elections. It matches voters with candidates based on policy positions before revealing names, parties, endorsements, or campaign spending.

The goal is simple: help people compare candidates on the issues instead of relying on name recognition or advertising.

## How it works

1. Enter an Ohio address or ZIP code.
2. Review the races and ballot issues for your area.
3. Answer short questions about local priorities.
4. Choose how important each issue is to you.
5. See candidates ranked by policy agreement under anonymous labels.
6. Reveal candidate names, parties, endorsements, and spending.
7. Print **My Blind Ballot** as a personal reference sheet.

Voter answers are used to calculate the results and are not stored.

## Main features

- Address-based Ohio district lookup
- Local and statewide election information
- Policy-first candidate matching
- Hidden identities during matching
- Campaign-spending comparison after the reveal
- Printable personal ballot summary
- Candidate response portal at `/candidates`
- Optional matching walkthrough at `/additional-features`

Blind Ballot contains no ads, sponsored placement, or fundraising-based rankings.

## Data

Blind Ballot combines real public election data with clearly labeled demo content.

| Information | Source |
| --- | --- |
| Ohio districts | U.S. Census Bureau Geocoder |
| Statewide candidates | Ohio county boards of elections |
| Local candidates | County boards of elections |
| U.S. Senate campaign spending | Federal Election Commission |
| ZIP-to-county mapping | U.S. Census Bureau |
| Demo candidate positions | Fictional data for demonstration |

Real candidates without submitted policy positions are shown as **No candidate has answered yet**. The app does not invent positions for real people.

## Matching

Candidates and voters answer the same issue questions on a scale from strongly disagree to strongly agree. Each match score is based on:

- How closely the answers agree
- How important each issue is to the voter
- Only the issues handled by that office

Names, parties, endorsements, and spending are added only after matching. Changing those details does not change a candidate’s score.

The app also runs repeated what-if comparisons with small changes to the voter’s answers and priorities. This helps show whether a result is stable or whether the race is a close match. These results describe the matching calculation, not election odds.

## Candidate portal

Candidates can open `/candidates` and answer the same questions voters see. Each answer includes a short explanation in the candidate’s own words.

The demo does not verify candidate identity and does not permanently save portal submissions. A public release would need identity verification and durable storage.

## Run locally

Requirements:

- Python 3.11 or newer
- Node.js 20.9 or newer
- `uv`

Install dependencies:

```sh
cd backend
uv sync --frozen

cd ../frontend
npm ci
```

From the repository root, start both services:

```sh
./start.sh
```

Or run them in separate terminals:

```sh
cd backend
uv run uvicorn main:app --host 127.0.0.1 --port 8000
```

```sh
cd frontend
npm run build
npm run start
```

Open <http://127.0.0.1:3000>. API documentation is available at <http://127.0.0.1:8000/docs>.

For frontend development, use:

```sh
cd frontend
npm run dev
```

## Configuration

To load current U.S. Senate campaign-spending data, add a free Federal Election Commission key to the backend environment:

```sh
FEC_API_KEY=your-key
```

Without a key, the app uses the public demonstration key with lower request limits.

For deployment, set `BACKEND_URL` in the frontend environment to the public API URL.

## Tests

Run backend tests:

