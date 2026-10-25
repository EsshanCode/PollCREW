"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Scale } from "lucide-react";
import Header from "@/components/Header";
import { State, api, loadState } from "@/lib/api";

const STANCES = [
  { value: -2, label: "Strongly disagree" },
  { value: -1, label: "Disagree" },
  { value: 0, label: "Neutral" },
  { value: 1, label: "Agree" },
  { value: 2, label: "Strongly agree" },
];
const LIMIT = 160;
type Draft = { stance: number | null; reason: string };

export default function Candidates() {
  const [state, setState] = useState<State | null>(null);
  const [countyId, setCountyId] = useState("delaware");
  const [raceId, setRaceId] = useState("");
  const [name, setName] = useState("");
  const [party, setParty] = useState("Nonpartisan");
  const [spending, setSpending] = useState("");
  const [endorsements, setEndorsements] = useState(["", "", ""]);
  const [answers, setAnswers] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    loadState().then(setState);
  }, []);
  const county = state?.counties.find((c) => c.id === countyId);
  const race = county?.races.find((r) => r.id === raceId) ?? county?.races[0];
  const issues = useMemo(
    () =>
      race && state
        ? state.issues.filter((i) => race.issues.includes(i.id))
        : [],
    [race, state],
  );
  const answered = issues.filter((i) => answers[i.id]?.stance != null).length;

  async function submit() {
    if (!state || !race) return;
    setBusy(true);
    setError("");
    try {
      const body = {
        county: countyId,
        race_id: race.id,
        name,
        party: race.partisan ? party : "Nonpartisan",
        spending: Number(spending || 0),
        endorsements: endorsements.filter((e) => e.trim()),
        answers: Object.fromEntries(
          issues
            .filter((i) => answers[i.id]?.stance != null)
            .map((i) => [i.id, answers[i.id]]),
        ),
      };
      const next = await api<State>(
        "/candidates",
        state.session_id,
        "POST",
        body,
      );
      setState(next);
      setDone(race.office);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <Header active="candidate" />
      <main className="wrap wide">
        <section className="portal-intro">
          <Scale size={40} />
          <div>
            <h1>Tell voters what you’d actually do.</h1>
            <p className="lead">
              Every candidate answers the same questions in the same space. No
              photos, no ads, no paid placement. Voters are matched to you on
              your answers first and only see your name, party and spending
              after.
            </p>
          </div>
        </section>

        {done ? (
          <section className="panel step center">
            <span className="done-badge">
              <Check size={34} strokeWidth={3} />
            </span>
            <h1>You’re on the {done} ballot</h1>
            <p className="lead">
              Voters in this demo will now be matched to you blind, next to
              everyone else in the race.
            </p>
            <div className="sheet-actions">
              <a className="primary as-button" href="/">
                See it as a voter <ArrowRight size={18} />
              </a>
              <button
                className="secondary"
                onClick={() => {
                  setDone(null);
                  setName("");
                  setAnswers({});
                  setSpending("");
                  setEndorsements(["", "", ""]);
                }}
              >
                Add another candidate
              </button>
            </div>
          </section>
        ) : !state || !county || !race ? (
          <div className="panel center">
            <span className="spinner" /> Loading…
          </div>
        ) : (
          <div className="portal">
            <section className="panel">
              <h2>1. Your race</h2>
              <div className="form-grid">
                <label>
                  County
                  <select
                    value={countyId}
                    onChange={(e) => {
                      setCountyId(e.target.value);
                      setRaceId("");
                      setAnswers({});
                    }}
                  >
                    {state.counties.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Office
                  <select
                    value={race.id}
                    onChange={(e) => {
                      setRaceId(e.target.value);
                      setAnswers({});
                    }}
                  >
                    {county.races.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.office}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="small">{race.what}</p>

              <h2>2. About you</h2>
              <div className="form-grid">
                <label>
                  Name as it appears on the ballot
                  <input
                    value={name}
                    maxLength={60}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                {race.partisan ? (
                  <label>
                    Party
                    <select
                      value={party}
                      onChange={(e) => setParty(e.target.value)}
                    >
                      {state.parties.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <div className="nonpartisan-note">
                    <strong>Nonpartisan race</strong>
                    Ohio prints no party for this office. List any party
                    endorsement below instead.
                  </div>
                )}
                <label>
                  Spending so far ($)
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={spending}
                    onChange={(e) => setSpending(e.target.value)}
                  />
                  <small>
                    In a real launch this comes from your campaign finance
                    reports. Shown only after voters match.
                  </small>
                </label>
              </div>
              <fieldset className="endorsements">
                <legend>Endorsements (up to 3, optional)</legend>
                {endorsements.map((e, i) => (
                  <input
                    key={i}
                    aria-label={`Endorsement ${i + 1}`}
                    value={e}
                    maxLength={60}
                    onChange={(ev) =>
                      setEndorsements(
                        endorsements.map((x, k) =>
                          k === i ? ev.target.value : x,
                        ),
                      )
                    }
                  />
                ))}
              </fieldset>

              <h2>
                3. Your positions{" "}
                <span className="small">
                  {answered} of {issues.length} answered
                </span>
              </h2>
              <p className="small">
                Same questions voters answer. Skip any you won’t take a position
                on; voters will see “didn’t answer.”
              </p>
              {issues.map((issue) => {
                const a = answers[issue.id] ?? { stance: null, reason: "" };
                return (
                  <fieldset key={issue.id} className="position">
                    <legend>
                      <span className="topic">{issue.topic}</span>
                      {issue.text}
                    </legend>
                    <div className="segmented five">
                      {STANCES.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          aria-pressed={a.stance === s.value}
                          className={a.stance === s.value ? "on" : ""}
                          onClick={() =>
                            setAnswers({
                              ...answers,
                              [issue.id]: { ...a, stance: s.value },
                            })
                          }
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                    <label className="reason">
                      Why, in your words
                      <textarea
                        rows={2}
                        maxLength={LIMIT}
                        value={a.reason}
                        onChange={(e) =>
                          setAnswers({
                            ...answers,
                            [issue.id]: { ...a, reason: e.target.value },
                          })
                        }
                      />
                      <small
                        className={
                          a.reason.length > LIMIT - 20 ? "count warn" : "count"
                        }
                      >
                        {a.reason.length}/{LIMIT}
                      </small>
                    </label>
                  </fieldset>
                );
              })}
              {error && (
                <div className="alert" role="alert">
                  {error}
                </div>
              )}
              <button
                className="primary big"
                disabled={busy || name.trim().length < 2 || answered === 0}
                onClick={submit}
              >
                {busy ? "Adding…" : "Add me to the ballot"}{" "}
                <ArrowRight size={20} />
              </button>
            </section>

            <aside className="panel preview">
              <h2>How voters see you first</h2>
              <p className="small">
                Exactly the same card as every other candidate.
              </p>
              <div className="cand-preview">
                <span className="avatar">?</span>
                <div>
                  <strong>Candidate ?</strong>
                  <span className="meta muted">
                    Identity hidden until the reveal
                  </span>
                </div>
              </div>
              <ul className="why">
                {issues.map((issue) => {
                  const a = answers[issue.id];
                  return (
                    <li
                      key={issue.id}
                      className={a?.stance == null ? "skipped" : "partly"}
                    >
                      <span className="why-kind">
                        {a?.stance == null
                          ? "Didn’t answer"
                          : STANCES.find((s) => s.value === a.stance)!.label}
                      </span>
                      <strong>{issue.short}</strong>
                      {a?.reason && <q>{a.reason}</q>}
                    </li>
                  );
                })}
              </ul>
            </aside>
          </div>
        )}
      </main>
      <footer className="foot">
        Blind Ballot, HackOHI/O 2026. Demo: candidates added here live only in
        this browser tab’s demo session.
      </footer>
    </div>
  );
}
