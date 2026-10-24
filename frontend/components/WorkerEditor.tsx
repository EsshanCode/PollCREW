"use client";
import { useState } from "react";
import { Worker } from "./types";
export default function WorkerEditor({
  worker,
  skills,
  locked,
  request,
  save,
}: {
  worker: Worker;
  skills: Record<string, string>;
  locked: boolean;
  request: (path: string, method: string, body?: unknown) => Promise<any>;
  save: (w: Worker) => Promise<void>;
}) {
  const [draft, setDraft] = useState(worker);
  const [suggestions, setSuggestions] = useState<
    { skill: string; evidence: string }[]
  >([]);
  const [mode, setMode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function extract() {
    setBusy(true);
    setMessage("");
    try {
      const result = await request("/extract", "POST", {
        text: draft.experience,
      });
      setSuggestions(result.suggestions);
      setMode(result.mode);
      if (!result.suggestions.length)
        setMessage(
          "No supported skills found. You can still edit your confirmed skills below.",
        );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function choose(skill: string, confirmed: boolean) {
    setDraft((d) => ({
      ...d,
      confirmed_skills: confirmed
        ? [...new Set([...d.confirmed_skills, skill])]
        : d.confirmed_skills.filter((s) => s !== skill),
      rejected_skills: confirmed
        ? d.rejected_skills.filter((s) => s !== skill)
        : [...new Set([...d.rejected_skills, skill])],
    }));
    setSuggestions((s) => s.filter((x) => x.skill !== skill));
  }
  return (
    <section className="panel editor">
      <div className="section-heading">
        <div>
          <span className="eyebrow">WORKER PROFILE · {worker.id}</span>
          <h2>{worker.name}</h2>
        </div>
        <span className="pill">Synthetic worker</span>
      </div>
      <p>
        Describe your experience. Suggestions only affect assignments after you
        confirm and save them.
      </p>
      {locked && (
        <p className="notice">
          This plan has been generated. Reset the demo to edit profiles.
        </p>
      )}
      <fieldset disabled={locked || busy}>
        <label>
          Experience
          <textarea
            value={draft.experience}
            maxLength={4000}
            onChange={(e) => setDraft({ ...draft, experience: e.target.value })}
            placeholder="I helped with registration and data entry. I troubleshoot tablets and printers. I led a team of volunteers."
          />
        </label>
        <button
          className="secondary"
          onClick={extract}
          disabled={!draft.experience.trim()}
        >
          Extract suggested skills
        </button>
        {mode && <p className="small">{mode}</p>}
        {suggestions.map((s) => (
          <div className="suggestion" key={s.skill}>
            <strong>{skills[s.skill]}</strong>
            <blockquote>“{s.evidence}”</blockquote>
            <div className="button-row">
              <button onClick={() => choose(s.skill, true)}>Confirm</button>
              <button
                className="secondary"
                onClick={() => choose(s.skill, false)}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
        <h3>Confirmed skills</h3>
        <div className="skill-options">
          {Object.entries(skills).map(([id, name]) => (
            <label className="check" key={id}>
              <input
                type="checkbox"
                checked={draft.confirmed_skills.includes(id)}
                onChange={(e) => choose(id, e.target.checked)}
              />
              {name}
            </label>
          ))}
        </div>
        <div className="form-grid">
          <label>
            Available from (hour)
            <input
              type="number"
              min="0"
              max="23"
              value={draft.available_start}
              onChange={(e) =>
                setDraft({ ...draft, available_start: +e.target.value })
              }
            />
          </label>
          <label>
            Available until (hour)
            <input
              type="number"
              min="1"
              max="24"
              value={draft.available_end}
              onChange={(e) =>
                setDraft({ ...draft, available_end: +e.target.value })
              }
            />
          </label>
          <label>
            Travel limit (km)
            <input
              type="number"
              min="0"
              max="500"
              value={draft.max_travel_km}
              onChange={(e) =>
                setDraft({ ...draft, max_travel_km: +e.target.value })
              }
            />
          </label>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.trained}
            onChange={(e) => setDraft({ ...draft, trained: e.target.checked })}
          />
          Operational training complete
        </label>
        <button
          onClick={async () => {
            setBusy(true);
            setMessage("");
            try {
              await save(draft);
              setMessage(
                "Confirmed profile saved. Only these skills will influence matching.",
              );
            } catch (e) {
              setMessage((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Save confirmed profile
        </button>
      </fieldset>
      <p role="status">{busy ? "Working…" : message}</p>
    </section>
  );
}
