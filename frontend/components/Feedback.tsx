"use client";
import { useEffect, useState } from "react";
import { MessageSquareHeart } from "lucide-react";

type Summary = { total: number; same: number; changed: number; unsure: number };

const CHOICES = [
  { value: "no", label: "No, I’d have picked differently" },
  { value: "yes", label: "Yes, the same" },
  { value: "unsure", label: "Not sure" },
];

async function post(body: object): Promise<Summary> {
  const res = await fetch("/api/feedback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Couldn’t send that. Try again in a moment.");
  return res.json();
}

export function FeedbackCard() {
  const [same, setSame] = useState<string | null>(null);
  const [confusing, setConfusing] = useState("");
  const [sent, setSent] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  if (sent)
    return (
      <section className="feedback-card done no-print" role="status">
        <strong>Thanks for testing Blind Ballot.</strong>
        <span>
          {sent.changed} of {sent.total} testers so far said seeing names and
          parties first would have changed their pick.
        </span>
      </section>
    );
  return (
    <section className="feedback-card no-print" aria-labelledby="fb-title">
      <h2 id="fb-title">
        <MessageSquareHeart size={20} /> Quick question (optional)
      </h2>
      <p className="small">Anonymous, and never linked to your answers.</p>
      <fieldset>
        <legend>
          Would you have picked the same candidates if you’d seen names and
          parties first?
        </legend>
        <div className="fb-choices">
          {CHOICES.map((c) => (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={same === c.value}
              className={same === c.value ? "fb-choice on" : "fb-choice"}
              onClick={() => setSame(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </fieldset>
      <label htmlFor="fb-confusing">
        Anything confusing? <span className="opt">optional</span>
      </label>
      <input
        id="fb-confusing"
        value={confusing}
        maxLength={200}
        onChange={(e) => setConfusing(e.target.value)}
        placeholder="One line is plenty"
      />
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      <button
        className="primary"
        disabled={!same}
        onClick={async () => {
          setError("");
          try {
            setSent(await post({ same, confusing }));
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        Send feedback
      </button>
    </section>
  );
}

export function LiveFeedback() {
  const [summary, setSummary] = useState<Summary | null>(null);
  useEffect(() => {
    fetch("/api/feedback/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);
  if (!summary || summary.total === 0) return null;
  return (
    <p className="live-feedback">
      <strong>Live from the in-app question:</strong> {summary.changed} of{" "}
      {summary.total} testers said seeing names and parties first would have
      changed their pick ({summary.same} same, {summary.unsure} not sure).
    </p>
  );
}
