import type { Metadata } from "next";
import { ArrowDown, ExternalLink } from "lucide-react";
import Header from "@/components/Header";
import { LiveFeedback } from "@/components/Feedback";
import { FEEDBACK, FEEDBACK_SUMMARY } from "@/lib/feedback";

export const metadata: Metadata = {
  title: "How it works · Blind Ballot",
  description:
    "What Blind Ballot does differently, how the matching works, where the data comes from, and what we changed along the way.",
};

const TOOLS = [
  {
    name: "Ballotpedia sample ballot",
    good: "Candidate bios, past results and survey answers.",
    gap: "Local races only in the 100 largest U.S. cities. Names and parties come first.",
    url: "https://civictech.guide/projects/ballotpedia-sample-ballot-lookup",
  },
  {
    name: "VOTE411 (League of Women Voters)",
    good: "Candidates answer the same questions in their own words.",
    gap: "You read and compare every answer yourself, next to names and parties.",
    url: "https://my.lwv.org/node/65462",
  },
  {
    name: "iSideWith",
    good: "Issue quiz that matches you to candidates, including local ones.",
    gap: "We didn’t find a step that hides names, parties and money before you see a match.",
    url: "https://www.builtinla.com/articles/isidewith-online-political-quiz-changing-way-we-vote",
  },
  {
    name: "BallotReady",
    good: "Personal ballot with local races and candidate positions.",
    gap: "Profiles lead with names, and include campaign ads.",
    url: "https://news.medill.northwestern.edu/chicago/vote-informed-ballotready-stresses-local-races/",
  },
];

const FLOW = [
  [
    "Your address or ZIP",
    "U.S. Census Geocoder finds your county and districts.",
  ],
  [
    "Your real ballot",
    "Official candidate lists from 80 Ohio county boards, plus the 8 statewide races.",
  ],
  [
    "Your priorities",
    "Plain questions on 8 local issues, and how much each one matters to you.",
  ],
  [
    "Blind match",
    "Scored on positions only. Names, parties and money never reach the math.",
  ],
  [
    "The reveal",
    "Names, party, backers and campaign money, next to your match.",
  ],
  ["Your ballot sheet", "A printable list to bring into the booth."],
];

const QUESTIONS = [
  [
    "Does money actually decide races?",
    "Found that the bigger spender won 91% of U.S. House races over four cycles (OpenSecrets data).",
    "Made money the last thing you see, never the first.",
  ],
  [
    "Why do people skip local races?",
    "Knox County, Ohio: about 10,000 fewer votes for state school board than for president, in the race with no party labels.",
    "Built for the races with the least information.",
  ],
  [
    "How sure is a match?",
    "People aren’t certain of their own answers. We rerun every match 2,000 times with small changes.",
    "Each match says how often it holds up, and flags close calls.",
  ],
  [
    "Can we get every Ohio county’s real ballot?",
    "No statewide feed exists, and Google’s Civic API has no Ohio local races.",
    "Collected 80 of 88 county lists ourselves, from each board’s own document.",
  ],
];

const PIVOTS = [
  [
    "Started: PollCREW",
    "A poll-worker staffing tool. We couldn’t say in one line what a user walked away with.",
    "Lesson: one clear output. That became the printable ballot sheet.",
  ],
  [
    "Data wall",
    "No statewide candidate feed. Some county sites blocked automated reading.",
    "Read each county’s official PDF directly, then checked names against the source.",
  ],
  [
    "Results too busy",
    "Our own testing: a grid of every race at once was overwhelming.",
    "One race per screen, with Next, and plainer words.",
  ],
  [
    "The ballot changed mid-race",
    "A 4th District appeals judge candidate died. Older county notices still listed him.",
    "Cross-checked newer notices and updated all 11 counties.",
  ],
  [
    "Address friction",
    "One long address box failed for ZIP-only and some addresses.",
    "ZIP is the only required box. Street narrows to your exact districts.",
  ],
];

const MISSING = [
  "Coshocton",
  "Henry",
  "Huron",
  "Lucas",
  "Mercer",
  "Morrow",
  "Sandusky",
  "Williams",
];

export default function About() {
  return (
    <div className="page">
      <Header active="about" />
      <main className="wrap about">
        <section className="panel">
          <h1>How Blind Ballot works</h1>
          <p className="lead">
            Most voter tools show you the name and party first. We show them
            last, after you’ve matched on what candidates would actually do.
          </p>
        </section>

        <section className="panel">
          <h2>What already exists</h2>
          <p className="small">
            We studied four popular tools before building. Each does something
            well. None we found hide names, parties and money until after you
            match.
          </p>
          <div className="tool-grid">
            {TOOLS.map((t) => (
              <a
                key={t.name}
                className="tool"
                href={t.url}
                target="_blank"
                rel="noreferrer"
              >
                <strong>
                  {t.name} <ExternalLink size={13} />
                </strong>
                <span className="good">{t.good}</span>
                <span className="gap">{t.gap}</span>
              </a>
            ))}
            <div className="tool ours">
              <strong>Blind Ballot</strong>
              <span className="good">
                Matches you on local issues with names, parties and money
                hidden. Then shows who they are and what they spent.
              </span>
              <span className="gap">
                Real candidates in 80 Ohio counties. Matching needs candidates
                to answer, through the free portal.
              </span>
            </div>
          </div>
        </section>

        <section className="panel">
          <h2>From your address to your ballot sheet</h2>
          <ol className="flow">
            {FLOW.map(([title, text], i) => (
              <li
                key={title}
                className={i === 3 ? "flow-step key" : "flow-step"}
              >
                <strong>{title}</strong>
                <span>{text}</span>
                {i < FLOW.length - 1 && (
                  <ArrowDown className="flow-arrow" size={20} aria-hidden />
                )}
              </li>
            ))}
          </ol>
          <div className="math">
            <p>
              <strong>Match score:</strong> on each issue an office handles,
              agreement = 1 − |you − candidate| ÷ 4, on a −2 to +2 scale,
              weighted by how much you said it matters.
            </p>
            <p>
              <strong>Confidence:</strong> 2,000 reruns with your answers nudged
              slightly. “Stays on top 84% of the time” means it held up in 84%
              of them.
            </p>
            <p>
              <strong>Money-blind by design:</strong> the matching code only
              receives positions. A test proves that changing a candidate’s
              money, party or backers can’t change any match.
            </p>
          </div>
        </section>

        <section className="panel">
          <h2>Questions we asked, and what we did</h2>
          <div className="qa-list">
            {QUESTIONS.map(([q, found, did]) => (
              <div key={q} className="qa">
                <strong>{q}</strong>
                <span>{found}</span>
                <span className="did">{did}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>What broke, and how we changed course</h2>
          <ol className="pivots">
            {PIVOTS.map(([title, problem, change]) => (
              <li key={title}>
                <strong>{title}</strong>
                <span>{problem}</span>
                <span className="did">{change}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="panel">
          <h2>What testers told us</h2>
          <p className="lead">{FEEDBACK_SUMMARY}</p>
          <div className="qa-list">
            {FEEDBACK.map((f) => (
              <blockquote key={f.quote} className="qa">
                <span>“{f.quote}”</span>
                <cite>{f.who}</cite>
              </blockquote>
            ))}
          </div>
          <LiveFeedback />
        </section>

        <section className="panel">
          <h2>Where the data comes from</h2>
          <ul className="sources">
            <li>
              <strong>Districts:</strong>{" "}
              <a
                href="https://geocoding.geo.census.gov/geocoder/"
                target="_blank"
                rel="noreferrer"
              >
                U.S. Census Bureau Geocoder
              </a>
              , 2026 Ohio legislative and congressional maps.
            </li>
            <li>
              <strong>ZIP to county:</strong>{" "}
              <a
                href="https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/"
                target="_blank"
                rel="noreferrer"
              >
                Census 2020 ZIP-to-county file
              </a>
              .
            </li>
            <li>
              <strong>Local candidates:</strong> each county board of elections’
              own published list, linked on every ballot. 80 of 88 counties. Not
              posted yet: {MISSING.join(", ")}.
            </li>
            <li>
              <strong>Statewide candidates:</strong> certified lists from the
              Wood and Hamilton County boards.
            </li>
            <li>
              <strong>Campaign money:</strong>{" "}
              <a
                href="https://api.open.fec.gov/developers/"
                target="_blank"
                rel="noreferrer"
              >
                FEC
              </a>{" "}
              filings for U.S. Senate.
            </li>
            <li>
              <strong>Demo matching:</strong> Delaware and Franklin County use
              real offices with made-up candidates, so you can try the full
              blind match.
            </li>
          </ul>
        </section>

        <section className="panel">
          <h2>If it reached 10× the people</h2>
          <ul className="sources">
            <li>
              Every state publishes ballots through county or local boards, so
              the same collection works anywhere. The matching math doesn’t
              change.
            </li>
            <li>
              The data is public and free. The real cost is getting candidates
              to answer. VOTE411’s questionnaires got a 51% median response in
              2024, so candidates do answer when asked.
            </li>
            <li>
              Partners: county boards, the League of Women Voters, campus voter
              drives.
            </li>
          </ul>
        </section>
      </main>
      <footer className="foot">
        Blind Ballot, HackOHI/O 2026. Nonpartisan. No ads, no paid placement,
        and your answers are never saved. Built with AI assistance.
      </footer>
    </div>
  );
}
