"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";
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
          "No skills found in that text. You can tick them below instead.",
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
      <div className="editor-head">
        <span className="person-avatar big">
          {worker.name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </span>
        <div>
          <h2>{worker.name}</h2>
          <span className="small">{worker.id}</span>
        </div>
      </div>
      {locked && (
        <p className="notice">The plan is built. Reset the demo to edit.</p>
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
          <Sparkles size={16} />
          Suggest skills
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
        <h3>Skills</h3>
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
            Starts (hour)
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
            Ends (hour)
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
            Max travel (km)
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
          Training done
        </label>
        <button
          onClick={async () => {
            setBusy(true);
            setMessage("");
            try {
              await save(draft);
              setMessage("Saved. Only ticked skills are used for matching.");
            } catch (e) {
              setMessage((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Save profile
        </button>
      </fieldset>
      <p role="status">{busy ? "Working…" : message}</p>
    </section>
  );
}
