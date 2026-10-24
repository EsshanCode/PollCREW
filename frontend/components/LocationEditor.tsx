"use client";
import { useState } from "react";
import { Location } from "./types";
export default function LocationEditor({
  location,
  skills,
  locked,
  save,
}: {
  location: Location;
  skills: Record<string, string>;
  locked: boolean;
  save: (l: Location) => Promise<void>;
}) {
  const [draft, setDraft] = useState(location);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <details className="location-config">
      <summary>Configure {location.name}</summary>
      <fieldset disabled={locked || busy}>
        <p className="small">
          Coordinator-defined operational requirements. Travel uses
          straight-line kilometers.
        </p>
        {draft.requirements.map((r, i) => (
          <div className="requirement" key={r.role}>
            <h3>{r.role}</h3>
            <div className="form-grid">
              <label>
                Desired workers
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={r.desired}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      requirements: draft.requirements.map((v, k) =>
                        k === i ? { ...v, desired: +e.target.value } : v,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Required minimum
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={r.minimum}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      requirements: draft.requirements.map((v, k) =>
                        k === i ? { ...v, minimum: +e.target.value } : v,
                      ),
                    })
                  }
                />
              </label>
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={r.training}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    requirements: draft.requirements.map((v, k) =>
                      k === i ? { ...v, training: e.target.checked } : v,
                    ),
                  })
                }
              />
              Training required
            </label>
            <div className="skill-options">
              {Object.entries(skills).map(([id, name]) => (
                <label className="check" key={id}>
                  <input
                    type="checkbox"
                    checked={r.skills.includes(id)}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        requirements: draft.requirements.map((v, k) =>
                          k === i
                            ? {
                                ...v,
                                skills: e.target.checked
                                  ? [...v.skills, id]
                                  : v.skills.filter((s) => s !== id),
                              }
                            : v,
                        ),
                      })
                    }
                  />
                  {name}
                </label>
              ))}
            </div>
          </div>
        ))}
        <div className="form-grid">
          <label>
            Arrivals / hour
            <input
              type="number"
              min="0"
              max="500"
              value={draft.arrival_per_hour}
              onChange={(e) =>
                setDraft({ ...draft, arrival_per_hour: +e.target.value })
              }
            />
          </label>
          <label>
            Service minutes
            <input
              type="number"
              min="0.1"
              max="30"
              step="0.1"
              value={draft.service_minutes}
              onChange={(e) =>
                setDraft({ ...draft, service_minutes: +e.target.value })
              }
            />
          </label>
          <label>
            Shift starts (hour)
            <input
              type="number"
              min="0"
              max="23"
              value={draft.start}
              onChange={(e) => setDraft({ ...draft, start: +e.target.value })}
            />
          </label>
          <label>
            Shift ends (hour)
            <input
              type="number"
              min="1"
              max="24"
              value={draft.end}
              onChange={(e) => setDraft({ ...draft, end: +e.target.value })}
            />
          </label>
        </div>
        <button
          onClick={async () => {
            setBusy(true);
            try {
              await save(draft);
              setMessage("Requirements saved.");
            } catch (e) {
              setMessage((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Save requirements
        </button>
      </fieldset>
      <p role="status">{message}</p>
      {locked && (
        <p className="small">Reset the demo to change requirements.</p>
      )}
    </details>
  );
}
