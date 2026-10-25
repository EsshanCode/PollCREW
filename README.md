# Blind Ballot

**Coordinated Routing of Election Workers · Hack/OHIO 2026**

PollCREW is a nonpartisan poll-worker staffing prototype. It helps coordinators:

- Review workers, skills, availability, and travel limits
- Set staffing needs for each polling place
- Create and approve a staffing plan
- Compare staffing coverage and estimated line risk
- Recover from worker cancellations without moving unaffected workers

All workers, staffing requirements, demand estimates, and precinct associations in the demo are synthetic. Real place names are used only for geographic context. PollCREW is not certified for election operations or legal compliance.

## Run locally

You need:

- Python 3.12
- Node.js 20.9 or newer
- `uv`

Start the API from the repository root:

```sh
cd backend
uv sync --frozen
uv run uvicorn main:app --host 127.0.0.1 --port 8000
```

In a second terminal, start the website:

```sh
cd frontend
npm ci
npm run build
npm run start
```

Open <http://127.0.0.1:3000>.

For frontend development, use `npm run dev`. API documentation is available at <http://127.0.0.1:8000/docs>.

The first plan may take longer while required files are downloaded. To run without that download, start the backend with `EMBEDDING_MODE=offline`.

## Demo workflow

1. Choose a jurisdiction.
2. Review workers and confirm their skills.
3. Adjust polling-place staffing needs if necessary.
4. Generate and review a staffing plan.
5. Approve the plan.
6. Simulate three cancellations.
7. Review and approve the recovery plan.

Use **Reset demo** to restore the original data.

## Poll worker view

Open <http://127.0.0.1:3000/worker> or select **Poll worker view** in the coordinator sidebar.

Workers can:

- Confirm skills in plain language
- Switch between English and Spanish
- Increase text size
- Review an assignment and get directions
- Report that they cannot attend

This demo uses sample-name selection instead of authentication. Spanish text should be reviewed by a native speaker before real-world use.

## Data and planning

The included demo contains 150 synthetic workers across:

- Wake County, North Carolina
- Dane County, Wisconsin
- Maricopa County, Arizona

Plans consider confirmed skills, availability, training, travel limits, staffing minimums, desired staffing, and the extra check-in worker budget. Remaining eligible workers are available as backups.

Line-risk estimates use synthetic arrival rates and attendance assumptions. They are useful for comparing demo plans, but they do not predict an individual voter’s wait time.

## Import polling places

PollCREW can look up polling places with the [Google Civic Information API](https://developers.google.com/civic-information).

1. Enable the Civic Information API in Google Cloud and create an API key.
2. Start the backend with `GOOGLE_CIVIC_API_KEY` set.
3. Enter addresses on the national overview and select **Find polling places**.

The API key stays on the server. Imported locations are real, but generated workers and staffing details remain synthetic. Results depend on election data being available for the submitted address.

## Deploy

The repository includes a Render configuration for the API. The website can be deployed to Vercel.
