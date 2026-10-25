"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  MapPin,
  Printer,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import Header from "@/components/Header";
import { Mascot } from "@/components/Brand";
import {
  County,
  MatchResult,
  RaceResult,
  State,
  api,
  loadState,
  money,
} from "@/lib/api";

type Step =
  "intro" | "address" | "ballot" | "question" | "party" | "results" | "sheet";
type Answer = { stance: number | null; weight: number };

const STANCES = [
  { value: -2, label: "Strongly disagree" },
  { value: -1, label: "Disagree" },
  { value: 0, label: "Neutral" },
  { value: 1, label: "Agree" },
  { value: 2, label: "Strongly agree" },
];
const WEIGHTS = [
  { value: 1, label: "A little" },
  { value: 2, label: "Somewhat" },
  { value: 3, label: "A lot" },
];
const PARTY_OPTIONS = [
  { value: "Democratic", label: "Usually Democratic" },
  { value: "Republican", label: "Usually Republican" },
  { value: "Independent", label: "Independent / it depends" },
  { value: "None", label: "Prefer not to say" },
];
const FACTS = [
  {
    stat: "91%",
    text: "of U.S. House races went to the bigger spender over four election cycles.",
    source: "Sherwood News, OpenSecrets data",
    url: "https://sherwood.news/world/election-winners-spend-big-to-win",
  },
  {
    stat: "50M",
    text: "Americans have little or no local news to learn about local candidates.",
    source: "Medill State of Local News, 2025",
    url: "https://www.medill.northwestern.edu/news/2025/news-deserts-hit-new-high-and-50-million-have-limited-access-to-local-news-study-finds.html",
  },
  {
    stat: "10,000",
    text: "fewer Knox County, Ohio voters marked the state school board race than the race for president in 2024.",
    source: "Kenyon College CSAD",
    url: "https://www.kenyon.edu/offices-and-services/center-for-the-study-of-american-democracy/associates/voter-drop-off-in-non-partisan-races/",
  },
];
const LEAN_TEXT = {
  yes: "Your answers lean YES",
  no: "Your answers lean NO",
  mixed: "Your answers are mixed on this one",
  unknown: "You skipped the questions this depends on",
};

export default function Voter() {
  const [state, setState] = useState<State | null>(null);
  const [waking, setWaking] = useState(false);
  const [step, setStep] = useState<Step>("intro");
  const [address, setAddress] = useState("");
  const [countyId, setCountyId] = useState("");
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [qIndex, setQIndex] = useState(0);
  const [party, setParty] = useState<string | null>(null);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadState(() => setWaking(true)).then((s) => {
      setState(s);
      setWaking(false);
    });
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step, qIndex]);

  const county: County | undefined = state?.counties.find(
    (c) => c.id === countyId,
  );
  const questions = useMemo(() => {
    if (!state || !county) return [];
    const used = new Set(county.races.flatMap((r) => r.issues));
    return state.issues.filter((i) => used.has(i.id));
  }, [state, county]);
  const question = questions[qIndex];
  const current = question ? answers[question.id] : undefined;

  async function findBallot(text: string) {
    setError("");
    setBusy(true);
    try {
      const found = await api<{ county: string }>("/lookup", "", "POST", {
        address: text,
      });
      setCountyId(found.county);
      setAddress(text);
      setStep("ballot");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function runMatch(usual: string | null) {
    if (!state) return;
    setBusy(true);
    setError("");
    try {
      const body = {
        county: countyId,
        answers,
        usual_party: usual,
      };
      setResult(
        await api<MatchResult>("/match", state.session_id, "POST", body),
      );
      setRevealed(false);
      setStep("results");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function answer(patch: Partial<Answer>) {
    if (!question) return;
    setAnswers({
      ...answers,
      [question.id]: {
        ...(answers[question.id] ?? { stance: null, weight: 2 }),
        ...patch,
      },
    });
  }
  function next() {
    if (qIndex + 1 < questions.length) setQIndex(qIndex + 1);
    else setStep("party");
  }
  function startOver() {
    setAnswers({});
    setQIndex(0);
    setParty(null);
    setResult(null);
    setRevealed(false);
    setCountyId("");
    setAddress("");
    setStep("intro");
  }
  const back: Partial<Record<Step, () => void>> = {
    address: () => setStep("intro"),
    ballot: () => setStep("address"),
    question: () => (qIndex > 0 ? setQIndex(qIndex - 1) : setStep("ballot")),
    party: () => {
      setQIndex(questions.length - 1);
      setStep("question");
    },
    sheet: () => setStep("results"),
  };

  return (
    <div className="page">
      <Header active="voter" />
      <main
        className={
          step === "results" || step === "sheet" ? "wrap wide" : "wrap"
        }
      >
        {back[step] && (
          <button className="back" onClick={back[step]}>
            <ArrowLeft size={18} /> Back
          </button>
        )}
        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}
        {!state && step !== "intro" && (
          <div className="panel center">
            <span className="spinner" />{" "}
            {waking ? "Waking up the server, about a minute…" : "Loading…"}
          </div>
        )}

        {step === "intro" && (
          <>
            <section className="hero">
              <div className="hero-text">
                <h1>Vote on policies, not ad budgets.</h1>
                <p className="lead">
                  Blind Ballot matches you with every candidate on your local
                  ballot, down to school board, by what they say they’d do.
                  Names, parties and money stay hidden until you’ve matched.
                </p>
                <button
                  className="primary big"
                  onClick={() => setStep("address")}
                >
                  Find my ballot <ArrowRight size={20} />
                </button>
              </div>
              <Mascot size={200} blindfold />
            </section>
            <ol className="how">
              <li>
                <span>1</span>
                <strong>Your ballot</strong>
                Every local race on it, even treasurer and trustee
              </li>
              <li>
                <span>2</span>
                <strong>Your priorities</strong>A few plain questions about
                local issues
              </li>
              <li>
                <span>3</span>
                <strong>Blind match</strong>
                Candidates ranked by policy, not name or money
              </li>
              <li>
                <span>4</span>
                <strong>The reveal</strong>
                Then see who they are, their party and spending
              </li>
            </ol>
            <section className="facts" aria-label="Why it matters">
              {FACTS.map((f) => (
                <a
                  key={f.stat}
                  className="fact"
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <strong>{f.stat}</strong>
                  <span>{f.text}</span>
                  <small>{f.source}</small>
                </a>
              ))}
            </section>
          </>
        )}

        {step === "address" && state && (
          <section className="panel step">
            <h1>Where do you vote?</h1>
            <p className="lead">
              Your address decides which races are on your ballot. It’s only
              used for this lookup.
            </p>
            <form
              className="address"
              onSubmit={(e) => {
                e.preventDefault();
                findBallot(address);
              }}
            >
              <label htmlFor="address">Home address or ZIP code</label>
              <div className="address-row">
                <input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 43035"
                  autoComplete="street-address"
                />
                <button
                  className="primary"
                  disabled={busy || address.trim().length < 3}
                >
                  <MapPin size={18} /> Find my ballot
                </button>
              </div>
            </form>
            <p className="fine">
              Demo covers Delaware and Franklin County, Ohio. Try:
            </p>
            <div className="chips">
              {state.counties.map((c) => (
                <button
                  key={c.id}
                  className="chip-button"
                  onClick={() => findBallot(c.sample_address)}
                >
                  {c.place.split(",")[0]} ({c.name})
                </button>
              ))}
            </div>
          </section>
        )}

        {step === "ballot" && county && (
          <section className="panel step">
            <p className="eyebrow-chip">
              <MapPin size={14} /> {county.name}, Ohio
            </p>
            <h1>
              Your ballot has {county.races.length + county.measures.length}{" "}
              local choices
            </h1>
            <p className="lead">
              These are the races people most often skip or guess on. You’ll
              answer {questions.length} quick questions about the issues these
              offices decide.
            </p>
            <ul className="ballot-list">
              {county.races.map((r) => (
                <li key={r.id}>
                  <div>
                    <strong>{r.office}</strong>
                    <span>{r.what}</span>
                  </div>
                  <small>
                    {r.candidates} candidates
                    {r.vote_for > 1 ? `, vote for ${r.vote_for}` : ""}
                    {!r.partisan ? ", no party on ballot" : ""}
                  </small>
                </li>
              ))}
              {county.measures.map((m) => (
                <li key={m.id} className="measure">
                  <div>
                    <strong>{m.title}</strong>
                    <span>{m.what}</span>
                  </div>
                  <small>Yes or no</small>
                </li>
              ))}
            </ul>
            <p className="demo-note">
              Demo ballot: real offices, fictional candidates.
            </p>
            <button
              className="primary big"
              onClick={() => {
                setQIndex(0);
                setStep("question");
              }}
            >
              Start the questions <ArrowRight size={20} />
            </button>
          </section>
        )}

        {step === "question" && question && (
          <section className="panel step">
            <div className="progress" aria-hidden>
              {questions.map((q, i) => (
                <span
                  key={q.id}
                  className={i < qIndex ? "done" : i === qIndex ? "now" : ""}
                />
              ))}
            </div>
            <p className="step-count">
              Question {qIndex + 1} of {questions.length}{" "}
              <span className="topic">{question.topic}</span>
            </p>
            <h1 className="statement">{question.text}</h1>
            <div className="stances" role="radiogroup" aria-label="Your view">
              {STANCES.map((s) => (
                <button
                  key={s.value}
                  role="radio"
                  aria-checked={current?.stance === s.value}
                  className={`stance s${s.value + 2}${current?.stance === s.value ? " on" : ""}`}
                  onClick={() => answer({ stance: s.value })}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {current?.stance != null && (
              <div className="importance">
                <p>How much does this matter to you?</p>
                <div
                  className="segmented"
                  role="radiogroup"
                  aria-label="How much it matters"
                >
                  {WEIGHTS.map((w) => (
                    <button
                      key={w.value}
                      role="radio"
                      aria-checked={current.weight === w.value}
                      className={current.weight === w.value ? "on" : ""}
                      onClick={() => answer({ weight: w.value })}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="question-actions">
              <button
                className="primary big"
                disabled={current?.stance == null}
                onClick={next}
              >
                Next <ArrowRight size={20} />
              </button>
              <button
                className="link"
                onClick={() => {
                  setAnswers({
                    ...answers,
                    [question.id]: { stance: null, weight: 0 },
                  });
                  next();
                }}
              >
                Skip this one
              </button>
            </div>
          </section>
        )}

        {step === "party" && (
          <section className="panel step">
            <p className="step-count">Last one, optional</p>
            <h1>Which party do you usually vote for?</h1>
            <p className="lead">
              It isn’t used for matching. It only lets the reveal show you when
              a match crosses party lines. Your answers are never saved.
            </p>
            <div className="options">
              {PARTY_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  className={party === p.value ? "option on" : "option"}
                  aria-pressed={party === p.value}
                  onClick={() => setParty(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              className="primary big"
              disabled={busy}
              onClick={() => runMatch(party)}
            >
              {busy ? "Matching…" : "See my blind matches"}{" "}
              <ArrowRight size={20} />
            </button>
          </section>
        )}

        {step === "results" && result && county && (
          <section className="results">
            <div className={revealed ? "banner revealed" : "banner"}>
              <Mascot size={110} blindfold={!revealed} />
              <div>
                {revealed ? (
                  <>
                    <h1>
                      In {result.summary.best_not_top_spender} of{" "}
                      {result.summary.matched} races, your best match was not
                      the biggest spender.
                    </h1>
                    <p className="lead">
                      {result.summary.usual_party &&
                      ["Democratic", "Republican"].includes(
                        result.summary.usual_party,
                      )
                        ? `${result.summary.crossed_party} of your top matches ${result.summary.crossed_party === 1 ? "comes" : "come"} from outside your usual party. `
                        : ""}
                      Matching never saw names, parties or money.
                    </p>
                  </>
                ) : (
                  <>
                    <h1>Your blind matches are ready</h1>
                    <p className="lead">
                      Ranked only by what candidates say they’d do. Names,
                      parties and spending are hidden.
                    </p>
                  </>
                )}
              </div>
              <div className="banner-actions">
                <button
                  role="switch"
                  aria-checked={revealed}
                  aria-label="Reveal who they are"
                  className={revealed ? "reveal-toggle on" : "reveal-toggle"}
                  onClick={() => setRevealed(!revealed)}
                >
                  <span className="toggle-label">
                    {revealed ? <Eye size={18} /> : <EyeOff size={18} />}
                    {revealed ? "Revealed" : "Blind"}
                  </span>
                  <span className="toggle-track" aria-hidden>
                    <span className="toggle-knob" />
                  </span>
                  <span className="toggle-hint">
                    {revealed ? "Tap to hide again" : "Tap to reveal"}
                  </span>
                </button>
                {revealed && (
                  <button className="primary" onClick={() => setStep("sheet")}>
                    <Printer size={18} /> Make my ballot sheet
                  </button>
                )}
              </div>
            </div>
            <div className="races">
              {result.races.map((race) => (
                <RaceCard key={race.race_id} race={race} revealed={revealed} />
              ))}
              {result.measures.map((m) => (
                <section key={m.id} className="race measure-card">
                  <header>
                    <div>
                      <h2>{m.title}</h2>
                      <p className="small">{m.what}</p>
                    </div>
                  </header>
                  <p className={`lean ${m.lean}`}>{LEAN_TEXT[m.lean]}</p>
                  <p className="small">
                    Based on how you answered about parks and libraries versus
                    property taxes. Ballot issues have no candidates to hide.
                  </p>
                </section>
              ))}
            </div>
            <p className="demo-note">
              Demo ballot: real offices, fictional candidates, positions and
              spending.
            </p>
          </section>
        )}

        {step === "sheet" && result && county && (
          <section className="sheet">
            <div className="sheet-head">
              <div>
                <p className="eyebrow-chip">My Blind Ballot</p>
                <h1>{county.name}, Ohio</h1>
                <p className="lead">
                  General election, November 3, 2026. Matched on policy before
                  seeing names, parties or money.
                </p>
              </div>
              <Mascot size={100} />
            </div>
            <ol className="sheet-list">
              {result.races.map((race) => (
                <li key={race.race_id}>
                  <div className="sheet-office">
                    <strong>{race.office}</strong>
                    <span>Vote for {race.vote_for}</span>
                  </div>
                  <div className="sheet-picks">
                    {race.best.length ? (
                      race.best.map((id) => {
                        const r = race.results.find(
                          (x) => x.candidate_id === id,
                        )!;
                        return (
                          <span key={id} className="pick">
                            <Check size={18} strokeWidth={3} />
                            {race.reveal[id].name}
                            <em>{r.match}% match</em>
                          </span>
                        );
                      })
                    ) : (
                      <span className="pick none">
                        No match (you skipped these issues)
                      </span>
                    )}
                  </div>
                </li>
              ))}
              {result.measures.map((m) => (
                <li key={m.id}>
                  <div className="sheet-office">
                    <strong>{m.title}</strong>
                    <span>Yes or no</span>
                  </div>
                  <div className="sheet-picks">
                    <span className={`pick lean-${m.lean}`}>
                      {LEAN_TEXT[m.lean]}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
            <p className="fine">
              Ohio lets you bring personal notes into the voting booth. This is
              a guide: you choose. Demo data: fictional candidates.
            </p>
            <div className="sheet-actions">
              <button className="primary" onClick={() => window.print()}>
                <Printer size={18} /> Print or save as PDF
              </button>
              <button className="secondary" onClick={startOver}>
                <RotateCcw size={18} /> Start over
              </button>
              <a className="secondary as-button" href="/candidates">
                <ShieldCheck size={18} /> Running for office? Add yourself
              </a>
            </div>
          </section>
        )}
      </main>
      <footer className="foot">
        Blind Ballot, HackOHI/O 2026. Nonpartisan. No ads, no paid placement,
        and your answers are never saved. Built with AI assistance.
      </footer>
    </div>
  );
}

function RaceCard({ race, revealed }: { race: RaceResult; revealed: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const maxSpend = Math.max(
    1,
    ...Object.values(race.reveal).map((r) => r.spending),
  );
  const best = race.best[0];
  const top = race.reveal[race.top_spender];
  const topMatch = race.results.find(
    (r) => r.candidate_id === race.top_spender,
  )?.match;
  return (
    <section className={revealed ? "race revealed" : "race"}>
      <header>
        <div>
          <h2>{race.office}</h2>
          <p className="small">{race.what}</p>
        </div>
        <span className="chip">
          {race.vote_for > 1 ? `Vote for ${race.vote_for}` : "Vote for 1"}
        </span>
      </header>
      {race.close_call && (
        <p className="close-call">
          Close call: small changes to your answers could flip this one.
        </p>
      )}
      <ol className="candidates">
        {race.results.map((r) => {
          const info = race.reveal[r.candidate_id];
          const isBest = race.best.includes(r.candidate_id);
          const expanded = open === r.candidate_id;
          return (
            <li key={r.candidate_id} className={isBest ? "cand best" : "cand"}>
              <button
                className="cand-row"
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : r.candidate_id)}
              >
                <span
                  className={revealed ? "avatar shown" : "avatar"}
                  aria-hidden
                >
                  {revealed
                    ? info.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                    : r.letter}
                </span>
                <span className="cand-name">
                  <strong>
                    {revealed ? info.name : `Candidate ${r.letter}`}
                  </strong>
                  {revealed ? (
                    <span className="meta">
                      <span className="chip small">{info.party}</span>
                      {info.source === "self" && (
                        <span className="chip small self">Self-reported</span>
                      )}
                    </span>
                  ) : (
                    <span className="meta muted">Identity hidden</span>
                  )}
                </span>
                <span className="match">
                  <span className="match-num">{r.match ?? "–"}%</span>
                  <span className="match-bar">
                    <span style={{ width: `${r.match ?? 0}%` }} />
                  </span>
                </span>
                <ChevronDown
                  size={20}
                  className={expanded ? "chev open" : "chev"}
                />
              </button>
              {isBest && r.chance != null && (
                <p className="chance">
                  {race.vote_for > 1
                    ? "In your top " + race.vote_for
                    : "Your best match"}{" "}
                  in {Math.round(r.chance * 100)}% of 2,000 what-ifs
                </p>
              )}
              {revealed && (
                <div className="money">
                  <span className="money-label">
                    Spent {money(info.spending)}
                  </span>
                  <span className="money-bar">
                    <span
                      style={{ width: `${(info.spending / maxSpend) * 100}%` }}
                    />
                  </span>
                  {info.endorsements.length > 0 && (
                    <span className="endorse">
                      Endorsed by {info.endorsements.join(", ")}
                    </span>
                  )}
                </div>
              )}
              {expanded && (
                <ul className="why">
                  {r.why.map((w) => (
                    <li key={w.issue} className={w.kind}>
                      <span className="why-kind">
                        {w.kind === "agree"
                          ? "Agrees with you"
                          : w.kind === "disagree"
                            ? "Disagrees"
                            : w.kind === "partly"
                              ? "Partly agrees"
                              : "Didn’t answer"}
                      </span>
                      <strong>{w.short}</strong>
                      {w.reason && <q>{w.reason}</q>}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
      {revealed && best && (
        <p className="punchline">
          {race.top_spender_is_best
            ? `Here your best match also spent the most (${money(top.spending)}). Money and policy point the same way in this race.`
            : `Your best match spent ${money(race.reveal[best].spending)}. The biggest spender, at ${money(top.spending)}, matched you ${topMatch}%.`}
        </p>
      )}
    </section>
  );
}
