"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Accessibility,
  ArrowLeft,
  CalendarDays,
  Check,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  Languages,
  MapPin,
  Navigation,
  Printer,
  Users,
} from "lucide-react";
import { AppState, Jurisdiction, Worker } from "@/components/types";
import { Lang, ROLE_TEXT, SKILL_TEXT, TEXT } from "./strings";
import "./worker.css";

type Step =
  | "who"
  | "about"
  | "skills"
  | "day"
  | "training"
  | "travel"
  | "review"
  | "saved"
  | "locked"
  | "home"
  | "confirm"
  | "cancelled";

const QUESTION_STEPS: Step[] = [
  "about",
  "skills",
  "day",
  "training",
  "travel",
  "review",
];
const SKILL_ORDER = [
  "check_in",
  "accessibility",
  "equipment",
  "leadership",
  "spanish",
];
const SKILL_ICON: Record<string, React.ReactNode> = {
  check_in: <ClipboardCheck size={30} aria-hidden />,
  accessibility: <Accessibility size={30} aria-hidden />,
  equipment: <Printer size={30} aria-hidden />,
  leadership: <Users size={30} aria-hidden />,
  spanish: <Languages size={30} aria-hidden />,
};
const MILES = [3, 10, 20];
const KM_PER_MILE = 1.609;

type Draft = {
  experience: string;
  skills: string[];
  evidence: Record<string, string>;
  allDay: boolean;
  trained: boolean;
  miles: number;
};

function draftFrom(w: Worker): Draft {
  const miles = w.max_travel_km / KM_PER_MILE;
  return {
    experience: w.experience,
    skills: [...w.confirmed_skills],
    evidence: {},
    allDay: w.available_end >= 20,
    trained: w.trained,
    miles: MILES.reduce((best, m) =>
      Math.abs(m - miles) < Math.abs(best - miles) ? m : best,
    ),
  };
}

function clock(hour: number) {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export default function WorkerPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [large, setLarge] = useState(false);
  const [sid, setSid] = useState("");
  const [data, setData] = useState<AppState | null>(null);
  const [jid, setJid] = useState("");
  const [wid, setWid] = useState("");
  const [search, setSearch] = useState("");
  const [step, setStep] = useState<Step>("who");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const t = TEXT[lang];

  useEffect(() => {
    try {
      const stored = localStorage.getItem("pollcrew-worker-prefs");
      if (stored) {
        const prefs = JSON.parse(stored);
        if (prefs.lang === "es") setLang("es");
        if (prefs.large) setLarge(true);
      }
    } catch {}
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("s");
    let stored = "";
    try {
      stored = sessionStorage.getItem("pollcrew-session") ?? "";
    } catch {}
    const id = fromUrl || stored;
    const wanted = params.get("j") ?? "";
    async function init() {
      try {
        let json: AppState & { session_id?: string };
        let session = id;
        const existing = id
          ? await fetch("/api/state", { headers: { "X-Demo-Session": id } })
          : null;
        if (existing?.ok) {
          json = await existing.json();
        } else {
          const created = await fetch("/api/sessions", { method: "POST" });
          if (!created.ok) throw new Error();
          json = await created.json();
          session = json.session_id ?? "";
        }
        try {
          sessionStorage.setItem("pollcrew-session", session);
        } catch {}
        setSid(session);
        setData(json);
        const first =
          json.jurisdictions.find((j) => j.jurisdiction.id === wanted) ??
          json.jurisdictions[0];
        setJid(first.jurisdiction.id);
      } catch {
        setError(TEXT.en.noSession);
      }
    }
    init();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "pollcrew-worker-prefs",
        JSON.stringify({ lang, large }),
      );
    } catch {}
    document.documentElement.lang = lang;
  }, [lang, large]);

  const request = useCallback(
    async (path: string, method = "GET", body?: unknown) => {
      const response = await fetch(`/api${path}`, {
        method,
        headers: { "Content-Type": "application/json", "X-Demo-Session": sid },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const json = await response.json();
      if (!response.ok) {
        const err = new Error(
          typeof json.detail === "string" ? json.detail : "",
        ) as Error & { status: number };
        err.status = response.status;
        throw err;
      }
      return json;
    },
    [sid],
  );

  const jurisdiction: Jurisdiction | undefined = data?.jurisdictions.find(
    (j) => j.jurisdiction.id === jid,
  );
  const worker = jurisdiction?.workers.find((w) => w.id === wid);
  const assignment = jurisdiction?.plan?.assignments.find(
    (a) => a.worker_id === wid,
  );
  const location = jurisdiction?.locations.find(
    (l) => l.id === assignment?.location_id,
  );
  const team = jurisdiction?.plan?.assignments.filter(
    (a) => a.location_id === assignment?.location_id,
  );
  const lead = team?.find((a) => a.role === "Site lead" && a.worker_id !== wid);
  const matches = useMemo(() => {
    const workers = jurisdiction?.workers ?? [];
    const q = search.trim().toLowerCase();
    return workers
      .filter(
        (w) =>
          !q ||
          w.name.toLowerCase().includes(q) ||
          w.id.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [jurisdiction, search]);

  function open(w: Worker) {
    setWid(w.id);
    setDraft(draftFrom(w));
    setError("");
    setStep(w.cancelled ? "cancelled" : jurisdiction?.plan ? "home" : "about");
  }

  async function findSkills() {
    if (!draft) return;
    if (!draft.experience.trim()) {
      setStep("skills");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await request("/extract", "POST", {
        text: draft.experience,
      });
      const evidence: Record<string, string> = {};
      const skills = new Set(draft.skills);
      for (const s of result.suggestions as {
        skill: string;
        evidence: string;
      }[]) {
        evidence[s.skill] = s.evidence;
        skills.add(s.skill);
      }
      setDraft({
        ...draft,
        evidence,
        skills: SKILL_ORDER.filter((s) => skills.has(s)),
      });
      setStep("skills");
    } catch {
      setError(t.error);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!draft || !worker) return;
    setBusy(true);
    setError("");
    try {
      const next = await request(
        `/jurisdictions/${jid}/workers/${wid}`,
        "PUT",
        {
          confirmed_skills: draft.skills,
          rejected_skills: worker.rejected_skills.filter(
            (s) => !draft.skills.includes(s),
          ),
          experience: draft.experience,
          trained: draft.trained,
          available_start: 6,
          available_end: draft.allDay ? 20 : 12,
          max_travel_km: Math.round(draft.miles * KM_PER_MILE * 10) / 10,
        },
      );
      setData(next);
      setStep("saved");
    } catch (e) {
      if ((e as { status?: number }).status === 409) setStep("locked");
      else setError(t.error);
    } finally {
      setBusy(false);
    }
  }

  async function cantMakeIt() {
    setBusy(true);
    setError("");
    try {
      const next = await request(
        `/jurisdictions/${jid}/workers/${wid}/unavailable`,
        "POST",
      );
      setData(next);
      setStep("cancelled");
    } catch (e) {
      setError(
        (e as { status?: number }).status === 409 ? t.busyTitle : t.error,
      );
    } finally {
      setBusy(false);
    }
  }

  const questionIndex = QUESTION_STEPS.indexOf(step);
  const previous: Partial<Record<Step, Step>> = {
    about: "who",
    skills: "about",
    day: "skills",
    training: "day",
    travel: "training",
    review: "travel",
    confirm: "home",
  };

  return (
    <div className={`wk ${large ? "wk-large" : ""}`}>
      <header className="wk-top">
        <a className="wk-brand" href="/worker">
          <span className="wk-mark">
            <Check size={20} strokeWidth={3} aria-hidden />
          </span>
          <span>
            Poll<span>CREW</span>
          </span>
        </a>
        <div className="wk-tools">
          <button
            className="wk-chip"
            onClick={() => setLarge(!large)}
            aria-pressed={large}
          >
            <span aria-hidden>A{large ? "−" : "+"}</span>
            {large ? t.smaller : t.bigger}
          </button>
          <button
            className="wk-chip"
            onClick={() => setLang(lang === "en" ? "es" : "en")}
            lang={lang === "en" ? "es" : "en"}
          >
            <Languages size={18} aria-hidden />
            {t.lang}
          </button>
        </div>
      </header>
      <main className="wk-main">
        {previous[step] && (
          <button
            className="wk-back"
            onClick={() => {
              setError("");
              setStep(previous[step]!);
            }}
          >
            <ArrowLeft size={20} aria-hidden />
            {t.back}
          </button>
        )}
        {questionIndex >= 0 && (
          <p className="wk-step">
            {t.step(questionIndex + 1, QUESTION_STEPS.length)}
          </p>
        )}
        {error && (
          <div className="wk-error" role="alert">
            <CircleAlert size={22} aria-hidden />
            {error}
          </div>
        )}
        {!data && !error && <p className="wk-lead">…</p>}

        {data && step === "who" && (
          <section>
            <h1>{t.whoTitle}</h1>
            <p className="wk-note">{t.demoNote}</p>
            <label className="wk-label" htmlFor="wk-county">
              {t.county}
            </label>
            <select
              id="wk-county"
              className="wk-input"
              value={jid}
              onChange={(e) => setJid(e.target.value)}
            >
              {data.jurisdictions.map((j) => (
                <option key={j.jurisdiction.id} value={j.jurisdiction.id}>
                  {j.jurisdiction.name}, {j.jurisdiction.state}
                </option>
              ))}
            </select>
            <label className="wk-label" htmlFor="wk-search">
              {t.searchName}
            </label>
            <input
              id="wk-search"
              className="wk-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
            />
            <ul className="wk-names">
              {matches.map((w) => (
                <li key={w.id}>
                  <button className="wk-name" onClick={() => open(w)}>
                    <span>{w.name}</span>
                    <small>{w.id}</small>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {draft && step === "about" && (
          <section>
            <h1>{t.aboutTitle}</h1>
            <p className="wk-lead">{t.aboutHelp}</p>
            <p className="wk-note">{t.aboutExample}</p>
            <label className="wk-label" htmlFor="wk-about">
              {t.aboutLabel}
            </label>
            <textarea
              id="wk-about"
              className="wk-input"
              rows={5}
              value={draft.experience}
              onChange={(e) =>
                setDraft({ ...draft, experience: e.target.value })
              }
            />
            <button className="wk-primary" disabled={busy} onClick={findSkills}>
              {t.findSkills}
            </button>
            <button className="wk-link" onClick={() => setStep("skills")}>
              {t.skip}
            </button>
          </section>
        )}

        {draft && step === "skills" && (
          <section>
            <h1>{t.skillsTitle}</h1>
            <p className="wk-lead">{t.skillsHelp}</p>
            <div className="wk-cards" role="group" aria-label={t.skillsTitle}>
              {SKILL_ORDER.map((skill) => {
                const on = draft.skills.includes(skill);
                return (
                  <button
                    key={skill}
                    className={`wk-card ${on ? "on" : ""}`}
                    aria-pressed={on}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        skills: on
                          ? draft.skills.filter((s) => s !== skill)
                          : SKILL_ORDER.filter(
                              (s) => s === skill || draft.skills.includes(s),
                            ),
                      })
                    }
                  >
                    <span className="wk-card-icon">{SKILL_ICON[skill]}</span>
                    <span className="wk-card-text">
                      <strong>{SKILL_TEXT[skill][lang].title}</strong>
                      <span>{SKILL_TEXT[skill][lang].body}</span>
                      {draft.evidence[skill] && (
                        <em>
                          {t.youSaid} “{draft.evidence[skill]}”
                        </em>
                      )}
                    </span>
                    <span className="wk-check" aria-hidden>
                      {on ? <Check size={22} strokeWidth={3} /> : null}
                    </span>
                    <span className="wk-sr">
                      {on ? t.selected : t.notSelected}
                    </span>
                  </button>
                );
              })}
            </div>
            {Object.keys(draft.evidence).length > 0 && (
              <p className="wk-note">{t.aiNote}</p>
            )}
            <button className="wk-primary" onClick={() => setStep("day")}>
              {t.next}
            </button>
          </section>
        )}

        {draft && step === "day" && (
          <Choice
            title={t.dayTitle}
            help={t.dayHelp}
            options={[
              { label: t.allDay, body: t.allDayBody, value: true },
              { label: t.morning, body: t.morningBody, value: false },
            ]}
            value={draft.allDay}
            onPick={(v) => {
              setDraft({ ...draft, allDay: v });
              setStep("training");
            }}
          />
        )}

        {draft && step === "training" && (
          <Choice
            title={t.trainingTitle}
            help={t.trainingHelp}
            options={[
              { label: t.yes, value: true },
              { label: t.no, value: false },
            ]}
            value={draft.trained}
            onPick={(v) => {
              setDraft({ ...draft, trained: v });
              setStep("travel");
            }}
          />
        )}

        {draft && step === "travel" && (
          <Choice
            title={t.travelTitle}
            help={t.travelHelp}
            options={MILES.map((m) => ({ label: t.miles(m), value: m }))}
            value={draft.miles}
            onPick={(v) => {
              setDraft({ ...draft, miles: v });
              setStep("review");
            }}
          />
        )}

        {draft && step === "review" && (
          <section>
            <h1>{t.reviewTitle}</h1>
            <dl className="wk-review">
              <Row
                label={t.skillsLabel}
                onChange={() => setStep("skills")}
                t={t}
              >
                {draft.skills.length
                  ? draft.skills
                      .map((s) => SKILL_TEXT[s][lang].title)
                      .join(", ")
                  : t.noneChosen}
              </Row>
              <Row label={t.dayLabel} onChange={() => setStep("day")} t={t}>
                {draft.allDay ? t.allDayBody : t.morningBody}
              </Row>
              <Row
                label={t.trainingLabel}
                onChange={() => setStep("training")}
                t={t}
              >
                {draft.trained ? t.yes : t.no}
              </Row>
              <Row
                label={t.travelLabel}
                onChange={() => setStep("travel")}
                t={t}
              >
                {t.miles(draft.miles)}
              </Row>
            </dl>
            <button className="wk-primary" disabled={busy} onClick={save}>
              {busy ? t.saving : t.save}
            </button>
          </section>
        )}

        {step === "saved" && (
          <Message
            icon={<Check size={40} strokeWidth={3} />}
            title={t.savedTitle}
            body={t.savedBody}
            tone="good"
          />
        )}
        {step === "locked" && (
          <Message
            icon={<CircleAlert size={40} />}
            title={t.lockedTitle}
            body={t.lockedBody}
            tone="warn"
          />
        )}

        {step === "home" && worker && (
          <section>
            <p className="wk-step">{worker.name}</p>
            {assignment && location ? (
              <>
                <h1>{t.dayTitleAssigned}</h1>
                <div className="wk-assignment">
                  <div className="wk-fact">
                    <CalendarDays size={28} aria-hidden />
                    <div>
                      <strong>{t.date}</strong>
                      <span>{t.arrive(clock(location.start - 0.5))}</span>
                    </div>
                  </div>
                  <div className="wk-fact">
                    <MapPin size={28} aria-hidden />
                    <div>
                      <span className="wk-small">{t.where}</span>
                      <strong>{location.name}</strong>
                      {location.address && <span>{location.address}</span>}
                    </div>
                  </div>
                  <div className="wk-fact">
                    <ClipboardCheck size={28} aria-hidden />
                    <div>
                      <span className="wk-small">{t.role}</span>
                      <strong>
                        {ROLE_TEXT[assignment.role]?.[lang].title ??
                          assignment.role}
                      </strong>
                      <span>{ROLE_TEXT[assignment.role]?.[lang].body}</span>
                    </div>
                  </div>
                  <div className="wk-fact">
                    <Users size={28} aria-hidden />
                    <div>
                      <span className="wk-small">{t.team}</span>
                      <strong>
                        {t.teamBody(lead?.worker_name ?? "", team?.length ?? 0)}
                      </strong>
                    </div>
                  </div>
                  <div className="wk-fact">
                    <Clock3 size={28} aria-hidden />
                    <div>
                      <strong>
                        {clock(location.start)} – {clock(location.end)}
                      </strong>
                    </div>
                  </div>
                </div>
                <a
                  className="wk-primary wk-as-button"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address ?? `${location.lat},${location.lon}`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Navigation size={22} aria-hidden />
                  {t.directions}
                </a>
                <button
                  className="wk-danger"
                  onClick={() => setStep("confirm")}
                >
                  {t.cantMake}
                </button>
              </>
            ) : (
              <Message
                icon={<Users size={40} />}
                title={t.backupTitle}
                body={t.backupBody}
                tone="good"
              >
                <button
                  className="wk-danger"
                  onClick={() => setStep("confirm")}
                >
                  {t.cantMake}
                </button>
              </Message>
            )}
          </section>
        )}

        {step === "confirm" && (
          <section>
            <h1>{t.confirmTitle}</h1>
            <p className="wk-lead">{t.confirmBody}</p>
            <button
              className="wk-danger solid"
              disabled={busy}
              onClick={cantMakeIt}
            >
              {t.confirmYes}
            </button>
            <button className="wk-secondary" onClick={() => setStep("home")}>
              {t.confirmNo}
            </button>
          </section>
        )}

        {step === "cancelled" && (
          <Message
            icon={<Check size={40} strokeWidth={3} />}
            title={t.cancelledTitle}
            body={t.cancelledBody}
            tone="good"
          />
        )}
      </main>
      <footer className="wk-foot">{t.appName}</footer>
    </div>
  );
}

function Choice<T>({
  title,
  help,
  options,
  value,
  onPick,
}: {
  title: string;
  help: string;
  options: { label: string; body?: string; value: T }[];
  value: T;
  onPick: (v: T) => void;
}) {
  return (
    <section>
      <h1>{title}</h1>
      <p className="wk-lead">{help}</p>
      <div className="wk-options" role="radiogroup" aria-label={title}>
        {options.map((o) => (
          <button
            key={String(o.value)}
            role="radio"
            aria-checked={o.value === value}
            className={`wk-option ${o.value === value ? "on" : ""}`}
            onClick={() => onPick(o.value)}
          >
            <span className="wk-radio" aria-hidden />
            <span>
              <strong>{o.label}</strong>
              {o.body && <span>{o.body}</span>}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function Row({
  label,
  children,
  onChange,
  t,
}: {
  label: string;
  children: React.ReactNode;
  onChange: () => void;
  t: (typeof TEXT)["en"];
}) {
  return (
    <div className="wk-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
      <button className="wk-link" onClick={onChange}>
        {t.change}
        <span className="wk-sr"> {label}</span>
      </button>
    </div>
  );
}

function Message({
  icon,
  title,
  body,
  tone,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  tone: "good" | "warn";
  children?: React.ReactNode;
}) {
  return (
    <section className={`wk-message ${tone}`} role="status">
      <span className="wk-message-icon" aria-hidden>
        {icon}
      </span>
      <h1>{title}</h1>
      <p className="wk-lead">{body}</p>
      {children}
    </section>
  );
}
