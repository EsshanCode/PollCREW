import type { Metadata } from "next";
import Header from "@/components/Header";
import { LiveFeedback } from "@/components/Feedback";
import { FEEDBACK, FEEDBACK_SUMMARY } from "@/lib/feedback";

export const metadata: Metadata = {
  title: "How it works · Blind Ballot",
  description:
    "What Blind Ballot does differently, how matching works, where the data comes from, and what we changed along the way.",
};

const FLOW = [
  ["Your ZIP or address", "Census data finds your districts"],
  ["Your real ballot", "Official lists from 80 Ohio counties"],
  ["Your priorities", "8 local issues, and how much each matters"],
  ["Blind match", "Positions only. No names, parties or money"],
  ["The reveal", "Who they are, their party, their spending"],
  ["Your ballot sheet", "Print it and bring it to the booth"],
];

const TOOLS = [
  [
    "Ballotpedia",
    "Local races only in the 100 largest cities",
    "https://civictech.guide/projects/ballotpedia-sample-ballot-lookup",
  ],
  [
    "VOTE411",
    "Answers to read yourself, names first",
    "https://my.lwv.org/node/65462",
  ],
  [
    "iSideWith",
    "Quiz matching, but no blind step we could find",
    "https://www.builtinla.com/articles/isidewith-online-political-quiz-changing-way-we-vote",
  ],
  [
    "BallotReady",
    "Profiles lead with names and ads",
    "https://news.medill.northwestern.edu/chicago/vote-informed-ballotready-stresses-local-races/",
  ],
];

const QUESTIONS = [
  [
    "Does money predict who wins?",
    "The bigger spender won 91% of House races. So money comes last.",
  ],
  [
    "Why do people skip local races?",
    "No party labels, no info. So we built for those races.",
  ],
  ["How sure is a match?", "We rerun it 2,000 times and flag close calls."],
  [
    "Can we get every county’s ballot?",
    "No feed existed. We collected 80 of 88 ourselves.",
  ],
];

const CHANGES = [
  [
    "PollCREW → Blind Ballot",
    "No clear output, so we built around one: the ballot sheet.",
  ],
  [
    "Blocked county sites",
    "Read each official PDF and checked names against it.",
  ],
  ["Busy results", "One race per screen, plainer words."],
  ["A candidate died mid-race", "Caught it and fixed 11 counties."],
  ["Address errors", "Only a ZIP is required now."],
];

const SOURCES: [string, string, string?][] = [
  [
    "Districts",
    "U.S. Census Geocoder",
    "https://geocoding.geo.census.gov/geocoder/",
  ],
  [
    "ZIP to county",
    "Census 2020 file",
    "https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/",
  ],
  ["Local candidates", "80 county boards (8 not posted)"],
  ["Statewide", "Certified county lists"],
  [
    "Money",
    "FEC filings for U.S. Senate. Local spending reports aren’t added yet",
    "https://api.open.fec.gov/developers/",
  ],
  [
    "Candidate positions",
    "Only from candidates, through the portal. Never guessed",
  ],
];

export default function About() {
  return (
    <div className="page">
      <Header active="about" />
      <main className="wrap wide about">
        <section className="panel about-head">
          <h1>How Blind Ballot works</h1>
          <p className="lead">
            Other voter tools show the name and party first. We show them last.
          </p>
        </section>

        <div className="about-grid two">
          <section className="panel">
            <h2>The flow</h2>
            <ol className="num-list">
              {FLOW.map(([title, text], i) => (
                <li key={title} className={i === 3 ? "key" : undefined}>
                  <span>{i + 1}</span>
                  <strong>{title}</strong>
                  {text}
                </li>
              ))}
            </ol>
          </section>
          <section className="panel">
            <h2>What already exists</h2>
            <ul className="plain-list">
              {TOOLS.map(([name, gap, url]) => (
                <li key={name}>
                  <a href={url} target="_blank" rel="noreferrer">
                    <strong>{name}</strong>
                  </a>
                  {gap}
                </li>
              ))}
              <li className="ours">
                <strong>Blind Ballot</strong>
                Hides names, parties and money until after you match
              </li>
            </ul>
          </section>
        </div>

        <div className="about-grid three">
          <section className="panel">
            <h2>Questions we asked</h2>
            <ul className="plain-list">
              {QUESTIONS.map(([q, a]) => (
                <li key={q}>
                  <strong>{q}</strong>
                  {a}
                </li>
              ))}
            </ul>
          </section>
          <section className="panel">
            <h2>What we changed</h2>
            <ul className="plain-list">
              {CHANGES.map(([what, fix]) => (
                <li key={what}>
                  <strong>{what}</strong>
                  {fix}
                </li>
              ))}
            </ul>
          </section>
          <section className="panel">
            <h2>What testers told us</h2>
            <p className="tester-stat">{FEEDBACK_SUMMARY}</p>
            <ul className="plain-list">
              {FEEDBACK.map((f) => (
                <li key={f.quote}>
                  <span>“{f.quote}”</span>
                  <small>{f.who}</small>
                </li>
              ))}
            </ul>
            <LiveFeedback />
          </section>
        </div>

        <div className="about-grid three">
          <section className="panel">
            <h2>The math</h2>
            <ul className="plain-list">
              <li>
                <strong>Match</strong>
                Agreement on each issue, weighted by how much you care
              </li>
              <li>
                <strong>Confidence</strong>
                2,000 reruns with your answers nudged slightly
              </li>
              <li>
                <strong>Money-blind</strong>
                The math only sees positions, and a test proves it
              </li>
              <li>
                <strong>No guessing</strong>
                Real candidates are matched only after they answer. Until then
                we list them
              </li>
            </ul>
          </section>
          <section className="panel">
            <h2>Where the data comes from</h2>
            <ul className="plain-list">
              {SOURCES.map(([what, from, url]) => (
                <li key={what}>
                  <strong>{what}</strong>
                  {url ? (
                    <a href={url} target="_blank" rel="noreferrer">
                      {from}
                    </a>
                  ) : (
                    from
                  )}
                </li>
              ))}
            </ul>
          </section>
          <section className="panel">
            <h2>At 10× the people</h2>
            <ul className="plain-list">
              <li>
                <strong>Any state</strong>
                Every state publishes ballots through local boards
              </li>
              <li>
                <strong>Free data</strong>
                The real work is getting candidates to answer. VOTE411 gets
                about half to respond
              </li>
              <li>
                <strong>Partners</strong>
                County boards, League of Women Voters, campus voter drives
              </li>
            </ul>
          </section>
        </div>
      </main>
      <footer className="foot">
        Blind Ballot, HackOHI/O 2026. Nonpartisan, no ads, nothing saved.
      </footer>
    </div>
  );
}
