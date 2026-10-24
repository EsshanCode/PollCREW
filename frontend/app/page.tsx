"use client";
import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  BarChart3,
  Check,
  ClipboardList,
  Globe2,
  LayoutDashboard,
  MapPin,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { AppState } from "@/components/types";
import WorkerEditor from "@/components/WorkerEditor";
import LocationEditor from "@/components/LocationEditor";
import ImportPanel from "@/components/ImportPanel";
import { LogoMark, Mascot } from "@/components/Brand";
const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => <div className="map loading">Loading map…</div>,
});
const RiskChart = dynamic(() => import("@/components/RiskChart"), {
  ssr: false,
  loading: () => <p>Loading chart…</p>,
});
const TradeoffChart = dynamic(() => import("@/components/TradeoffChart"), {
  ssr: false,
  loading: () => <p>Loading chart…</p>,
});

const TABS = [
  { id: "Overview", icon: LayoutDashboard },
  { id: "Workers", icon: Users },
  { id: "Plan", icon: ClipboardList },
  { id: "Sites", icon: MapPin },
  { id: "Results", icon: BarChart3 },
];

export default function Home() {
  const [data, setData] = useState<AppState | null>(null);
  const [sid, setSid] = useState("");
  const [selected, setSelected] = useState("");
  const [tab, setTab] = useState("Overview");
  const [workerId, setWorkerId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [formEpoch, setFormEpoch] = useState(0);
  const [filter, setFilter] = useState("");
  const [budgetDraft, setBudgetDraft] = useState<string | null>(null);
  const select = useCallback((id: string) => {
    setSelected(id);
    setTab("Overview");
    setWorkerId("");
    setNotice("");
    setError("");
  }, []);
  const request = useCallback(
    async (path: string, method = "GET", body?: unknown) => {
      const response = await fetch(`/api${path}`, {
        method,
        headers: { "Content-Type": "application/json", "X-Demo-Session": sid },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const json = await response.json();
      if (!response.ok)
        throw new Error(
          typeof json.detail === "string"
            ? json.detail
            : "Check your numbers: a minimum can’t be higher than the desired count, and a shift has to end after it starts.",
        );
      return json;
    },
    [sid],
  );
  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const stored = sessionStorage.getItem("pollcrew-session");
        let response = stored
          ? await fetch("/api/state", { headers: { "X-Demo-Session": stored } })
          : null;
        if (response?.ok) {
          const json = await response.json();
          if (active) {
            setSid(stored!);
            setData(json);
          }
        } else {
          response = await fetch("/api/sessions", { method: "POST" });
          if (!response.ok) throw new Error("Unable to start demo.");
          const json = await response.json();
          if (active) {
            sessionStorage.setItem("pollcrew-session", json.session_id);
            setSid(json.session_id);
            setData(json);
          }
        }
      } catch {
        if (active)
          setError(
            "Can’t reach the PollCREW server. Start the backend on port 8000, then reload.",
          );
      }
    }
    init();
    return () => {
      active = false;
    };
  }, []);
  async function action(
    working: string,
    path: string,
    done: string,
    body?: unknown,
  ) {
    setBusy(working);
    setError("");
    setNotice("");
    try {
      setData(await request(path, "POST", body));
      if (path === "/reset") setFormEpoch((n) => n + 1);
      setNotice(done);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  const current = data?.jurisdictions.find(
    (d) => d.jurisdiction.id === selected,
  );
  const plan = current?.plan;
  const impact = current?.impact;
  const workers = current?.workers ?? [];
  const worker = workers.find((w) => w.id === workerId) ?? workers[1];
  const totalWorkers =
    data?.jurisdictions.reduce((n, j) => n + j.workers.length, 0) ?? 0;
  const totalLocations =
    data?.jurisdictions.reduce((n, j) => n + j.locations.length, 0) ?? 0;
  const workerHref = `/worker${sid ? `?s=${sid}` : ""}${selected ? `${sid ? "&" : "?"}j=${selected}` : ""}`;
  const recovered = impact?.recovered != null;
  const steps = [
    { label: "Review workers", done: !!plan },
    { label: "Build the plan", done: !!plan },
    { label: "Approve", done: !!plan?.approved || !!impact },
    {
      label: "Handle Election Day",
      done: recovered && !!plan?.approved,
    },
  ];
  const currentStep = steps.findIndex((s) => !s.done);
  const cancelledCount = impact?.cancelled_ids.length ?? 0;

  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="PollCREW home">
          <LogoMark size={42} />
          <span>
            Poll<span>CREW</span>
          </span>
        </a>
        <nav className="side-nav" aria-label="Main">
          <button
            className={!selected ? "nav active" : "nav"}
            onClick={() => select("")}
          >
            <Globe2 size={19} />
            Home
          </button>
          <a className="nav" href={workerHref}>
            <Smartphone size={19} />
            Poll worker view
          </a>
          <div className="side-label">Counties</div>
          {data?.jurisdictions.map((j) => (
            <button
              key={j.jurisdiction.id}
              className={
                selected === j.jurisdiction.id
                  ? "nav county-nav active"
                  : "nav county-nav"
              }
              onClick={() => select(j.jurisdiction.id)}
            >
              <span className="state-code">{j.jurisdiction.code}</span>
              <span>
                {j.jurisdiction.name}
                <small>{j.jurisdiction.state}</small>
              </span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <ShieldCheck size={20} />
          <span>
            <strong>Nonpartisan</strong>
            <small>Demo data only</small>
          </span>
        </div>
      </aside>
      <main>
        <div className="bunting" aria-hidden />
        <div className="content">
          {error && (
            <div className="error" role="alert">
              {error}
              <button className="text-button" onClick={() => setError("")}>
                Dismiss
              </button>
            </div>
          )}
          <div role="status" aria-live="polite">
            {busy && (
              <div className="notice">
                <span className="spinner" />
                {busy}…
              </div>
            )}
            {notice && !busy && (
              <div className="success">
                <Check size={18} strokeWidth={3} />
                {notice}
              </div>
            )}
          </div>
          {!data ? (
            <div className="panel loading">
              {error ? "Waiting for the server." : "Loading…"}
            </div>
          ) : !current ? (
            <>
              <section className="hero">
                <div className="hero-text">
                  <h1>Every precinct crewed. Every line short.</h1>
                  <p className="subtitle">
                    Staff every polling place, then keep it staffed when
                    Election Day changes.
                  </p>
                  <div className="button-row">
                    <button
                      className="big"
                      onClick={() =>
                        select(data.jurisdictions[0].jurisdiction.id)
                      }
                    >
                      Start the demo <ArrowRight size={18} />
                    </button>
                    <button
                      className="secondary big"
                      disabled={!!busy}
                      onClick={() =>
                        action("Resetting", "/reset", "Demo reset.")
                      }
                    >
                      <RotateCcw size={16} />
                      Reset demo
                    </button>
                  </div>
                </div>
                <Mascot size={210} wave />
              </section>
              <div className="stats">
                <Stat value={`${data.jurisdictions.length}`} label="Counties" />
                <Stat value={`${totalWorkers}`} label="Poll workers" />
                <Stat value={`${totalLocations}`} label="Polling places" />
              </div>
              <section className="panel">
                <div className="section-heading">
                  <h2>Pick a county</h2>
                  <label className="state-filter">
                    <span className="sr-only">State</span>
                    <select
                      aria-label="Filter jurisdictions by state"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="">All states</option>
                      {data.jurisdictions.map((j) => (
                        <option
                          key={j.jurisdiction.id}
                          value={j.jurisdiction.code}
                        >
                          {j.jurisdiction.state}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="pick-grid">
                  <Map
                    data={data.jurisdictions}
                    selected=""
                    onSelect={select}
                  />
                  <div className="jurisdiction-cards">
                    {data.jurisdictions
                      .filter((j) => !filter || j.jurisdiction.code === filter)
                      .map((j) => (
                        <button
                          className="jurisdiction-card"
                          key={j.jurisdiction.id}
                          onClick={() => select(j.jurisdiction.id)}
                        >
                          <span className="state-badge">
                            {j.jurisdiction.code}
                          </span>
                          <span className="card-body">
                            <span className="card-state">
                              {j.jurisdiction.state}
                            </span>
                            <h3>{j.jurisdiction.name}</h3>
                            <span className="small">
                              {j.workers.length} workers, {j.locations.length}{" "}
                              {j.jurisdiction.real_locations
                                ? "real polling places"
                                : "sites"}
                            </span>
                          </span>
                          {j.plan ? (
                            <span className="chip done">
                              {j.plan.approved ? "Approved" : "Planned"}
                            </span>
                          ) : (
                            <ArrowRight size={20} />
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              </section>
              <ImportPanel
                configured={data.polling_api_configured}
                request={request}
                onImported={(next, id) => {
                  setData(next);
                  select(id);
                }}
              />
            </>
          ) : (
            <>
              <div className="heading-row">
                <div>
                  <h1>{current.jurisdiction.name}</h1>
                  <p className="subtitle">
                    {current.jurisdiction.state}
                    <span
                      className={
                        current.jurisdiction.real_locations
                          ? "chip live"
                          : "chip"
                      }
                    >
                      {current.jurisdiction.real_locations
                        ? "Real polling places"
                        : "Demo data"}
                    </span>
                  </p>
                </div>
                <button
                  className="secondary"
                  disabled={!!busy}
                  onClick={() => {
                    setWorkerId("");
                    action("Resetting", "/reset", "Demo reset.");
                  }}
                >
                  <RotateCcw size={16} />
                  Reset demo
                </button>
              </div>
              <ol className="stepper" aria-label="Progress">
                {steps.map((s, i) => (
                  <li
                    key={s.label}
                    className={
                      s.done ? "done" : i === currentStep ? "current" : ""
                    }
                    aria-current={i === currentStep ? "step" : undefined}
                  >
                    <span className="step-dot">
                      {s.done ? <Check size={16} strokeWidth={3.5} /> : i + 1}
                    </span>
                    {s.label}
                  </li>
                ))}
              </ol>
              <section className="next-step">
                <div>
                  <h2>
                    {!plan
                      ? "Build the staffing plan"
                      : plan.disrupted
                        ? `${cancelledCount} worker${cancelledCount === 1 ? " can’t" : "s can’t"} make it`
                        : !plan.approved
                          ? recovered
                            ? "Backups found"
                            : "Check the plan, then approve it"
                          : recovered
                            ? "Every site is covered again"
                            : "Plan approved"}
                  </h2>
                  <p>
                    {!plan
                      ? "PollCREW matches workers to sites in seconds. You can review worker skills first."
                      : plan.disrupted
                        ? `${impact?.preserved} other assignments stay exactly where they are.`
                        : !plan.approved
                          ? recovered
                            ? `${impact?.recovered} replacements are ready. Approve to send the changes.`
                            : `${plan.assignments.length} workers placed and ${Math.round(plan.coverage * 100)}% of spots filled.`
                          : recovered
                            ? `Line risk is back to ${plan.simulation.risk_percent}%.`
                            : "Now try an Election Day surprise."}
                  </p>
                </div>
                <div className="button-row">
                  {!plan && (
                    <>
                      <button
                        className="big"
                        disabled={!!busy}
                        onClick={() =>
                          action(
                            "Building the plan",
                            `/jurisdictions/${selected}/generate`,
                            "Plan ready.",
                          )
                        }
                      >
                        <Sparkles size={18} />
                        Build the plan
                      </button>
                      <button
                        className="secondary big"
                        onClick={() => setTab("Workers")}
                      >
                        Review workers
                      </button>
                    </>
                  )}
                  {plan && !plan.approved && !plan.disrupted && (
                    <>
                      <button
                        className="big"
                        disabled={!!busy}
                        onClick={() =>
                          action(
                            "Approving",
                            `/jurisdictions/${selected}/approve`,
                            "Approved.",
                            { revision: current.revision },
                          )
                        }
                      >
                        <Check size={18} strokeWidth={3} />
                        {impact ? "Approve revised plan" : "Approve plan"}
                      </button>
                      {tab !== "Plan" && (
                        <button
                          className="secondary big"
                          onClick={() => setTab("Plan")}
                        >
                          See who goes where
                        </button>
                      )}
                    </>
                  )}
                  {plan?.approved && !impact && (
                    <button
                      className="gold big"
                      disabled={!!busy}
                      onClick={() =>
                        action(
                          "Cancelling 3 workers",
                          `/jurisdictions/${selected}/cancel`,
                          "3 workers cancelled.",
                        )
                      }
                    >
                      <Zap size={18} />
                      Simulate 3 cancellations
                    </button>
                  )}
                  {plan?.disrupted && (
                    <button
                      className="big"
                      disabled={!!busy}
                      onClick={() =>
                        action(
                          "Finding backups",
                          `/jurisdictions/${selected}/recover`,
                          "Backups assigned.",
                        )
                      }
                    >
                      Recover with backups <ArrowRight size={18} />
                    </button>
                  )}
                  {plan?.approved && recovered && tab !== "Results" && (
                    <button
                      className="secondary big"
                      onClick={() => setTab("Results")}
                    >
                      See results
                    </button>
                  )}
                </div>
              </section>
              <div className="stats four">
                <Stat
                  value={`${workers.filter((w) => !w.cancelled).length}`}
                  label="Workers ready"
                  detail={
                    workers.some((w) => w.cancelled)
                      ? `${workers.filter((w) => w.cancelled).length} cancelled`
                      : undefined
                  }
                />
                <Stat
                  value={plan ? `${Math.round(plan.coverage * 100)}%` : "–"}
                  label="Spots filled"
                  detail={
                    plan
                      ? `${Math.round(plan.coverage * plan.needed)} of ${plan.needed}`
                      : undefined
                  }
                />
                <Stat
                  value={plan ? `${plan.simulation.risk_percent}%` : "–"}
                  label="Long-line risk"
                  detail="Chance any site waits 30+ min"
                  tone={
                    plan && plan.simulation.risk_percent > 30
                      ? "bad"
                      : undefined
                  }
                />
                <Stat
                  value={
                    plan?.approved
                      ? "Approved"
                      : plan?.disrupted
                        ? "Needs backups"
                        : plan
                          ? "Draft"
                          : "Not built"
                  }
                  label="Plan"
                  detail={`Version ${current.revision}`}
                />
              </div>
              {impact && (
                <section className="impact">
                  <h2>Election Day changes</h2>
                  <ul>
                    <li>
                      <strong>{impact.cancelled_ids.length}</strong> cancelled
                      <small>{impact.cancelled_ids.join(", ")}</small>
                    </li>
                    <li>
                      <strong>{impact.preserved}</strong> kept in place
                    </li>
                    <li>
                      <strong>{recovered ? impact.recovered : "–"}</strong>{" "}
                      {recovered ? "replaced" : "waiting for backups"}
                    </li>
                    <li>
                      <strong>
                        {impact.before_risk}% → {impact.after_risk}%
                        {recovered
                          ? ` → ${plan?.simulation.risk_percent}%`
                          : ""}
                      </strong>{" "}
                      long-line risk
                    </li>
                  </ul>
                </section>
              )}
              <nav className="tabs" aria-label="County sections">
                {TABS.map(({ id, icon: Icon }) => (
                  <button
                    className={tab === id ? "selected" : ""}
                    key={id}
                    onClick={() => setTab(id)}
                    aria-pressed={tab === id}
                  >
                    <Icon size={17} />
                    {id}
                  </button>
                ))}
              </nav>
              {tab === "Overview" && (
                <>
                  <div className="overview-grid">
                    <section className="panel map-panel">
                      <div className="section-heading">
                        <h2>Polling places</h2>
                        <span className="map-legend">
                          <span>
                            <i className="legend-dot" />
                            Fully staffed
                          </span>
                          <span>
                            <i className="legend-dot short" />
                            Short
                          </span>
                          <span>
                            <i className="legend-dot gray" />
                            No plan yet
                          </span>
                        </span>
                      </div>
                      <Map
                        data={data.jurisdictions}
                        selected={selected}
                        onSelect={select}
                      />
                      {current.jurisdiction.real_locations && (
                        <p className="map-note">
                          Polling places from {current.jurisdiction.source}.
                          Workers are demo data.
                        </p>
                      )}
                    </section>
                    <section className="panel">
                      <h2>Long-line risk by site</h2>
                      {plan ? (
                        <>
                          <RiskChart simulation={plan.simulation} />
                          <p className="small">
                            Share of 5,000 simulated Election Days where the
                            site’s wait passes 30 minutes.
                          </p>
                        </>
                      ) : (
                        <div className="empty">
                          <BarChart3 size={34} />
                          <p>Build the plan to see each site’s risk.</p>
                        </div>
                      )}
                    </section>
                  </div>
                  <div className="location-grid">
                    {current.locations.map((loc) => {
                      const assigned =
                        plan?.assignments.filter(
                          (a) => a.location_id === loc.id,
                        ) ?? [];
                      const risk = plan?.simulation.locations.find(
                        (l) => l.id === loc.id,
                      );
                      const need = loc.requirements.reduce(
                        (n, r) => n + r.desired,
                        0,
                      );
                      const full = plan && assigned.length >= need;
                      return (
                        <section className="panel location-card" key={loc.id}>
                          <div className="location-top">
                            <h3>{loc.name}</h3>
                            {plan && (
                              <span
                                className={full ? "chip done" : "chip warn"}
                              >
                                {Math.min(assigned.length, need)}/{need}
                                {assigned.length > need
                                  ? ` +${assigned.length - need}`
                                  : ""}
                              </span>
                            )}
                          </div>
                          <p className="small">
                            {loc.address ??
                              `Precincts ${loc.precincts.join(", ")}`}
                          </p>
                          <div className="progress">
                            <span
                              style={{
                                width: `${need ? Math.min(100, (assigned.length / need) * 100) : 100}%`,
                              }}
                            />
                          </div>
                          <div className="role-counts">
                            {loc.requirements.map((r) => (
                              <div key={r.role}>
                                <span>{r.role}</span>
                                <strong>
                                  {
                                    assigned.filter((a) => a.role === r.role)
                                      .length
                                  }
                                  /{r.desired}
                                </strong>
                              </div>
                            ))}
                          </div>
                          {risk && (
                            <p
                              className={
                                risk.risk_percent > 30
                                  ? "site-risk bad"
                                  : "site-risk"
                              }
                            >
                              Long-line risk{" "}
                              <strong>{risk.risk_percent}%</strong>
                            </p>
                          )}
                        </section>
                      );
                    })}
                  </div>
                </>
              )}
              {tab === "Workers" && (
                <div className="worker-grid">
                  <section className="panel worker-list">
                    <h2>Workers</h2>
                    <p className="small">Pick someone to review.</p>
                    {workers.map((w) => (
                      <button
                        className={
                          worker?.id === w.id
                            ? "worker selected-worker"
                            : "worker"
                        }
                        key={w.id}
                        onClick={() => setWorkerId(w.id)}
                      >
                        <span className="person-avatar">
                          {w.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                        <span>
                          <strong>{w.name}</strong>
                          <small>
                            {w.id}, {w.confirmed_skills.length} skills
                          </small>
                        </span>
                        {w.cancelled && (
                          <span className="chip bad">Cancelled</span>
                        )}
                      </button>
                    ))}
                  </section>
                  {worker && (
                    <WorkerEditor
                      key={`${formEpoch}-${selected}-${worker.id}`}
                      worker={worker}
                      skills={data.skills}
                      locked={!!plan}
                      request={request}
                      save={async (w) => {
                        setData(
                          await request(
                            `/jurisdictions/${selected}/workers/${w.id}`,
                            "PUT",
                            w,
                          ),
                        );
                      }}
                    />
                  )}
                </div>
              )}
              {tab === "Plan" && (
                <section className="panel">
                  <div className="section-heading">
                    <h2>Who goes where</h2>
                    {plan && (
                      <span className="chip">
                        {plan.assignments.length} assigned
                      </span>
                    )}
                  </div>
                  {!plan ? (
                    <div className="empty">
                      <ClipboardList size={34} />
                      <p>Build the plan to see assignments.</p>
                    </div>
                  ) : (
                    <>
                      {plan.gaps.length > 0 && (
                        <div className="notice">
                          Still open:{" "}
                          {plan.gaps
                            .map(
                              (g) => `${g.unfilled} ${g.role} at ${g.location}`,
                            )
                            .join(", ")}
                        </div>
                      )}
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Worker</th>
                              <th>Site and job</th>
                              <th>Fit</th>
                              <th>Why</th>
                            </tr>
                          </thead>
                          <tbody>
                            {plan.assignments.map((a) => (
                              <tr key={a.worker_id}>
                                <td>
                                  <strong>{a.worker_name}</strong>
                                  <small>{a.worker_id}</small>
                                </td>
                                <td>
                                  {
                                    current.locations.find(
                                      (l) => l.id === a.location_id,
                                    )?.name
                                  }
                                  <small>{a.role}</small>
                                </td>
                                <td>
                                  <span className="score">{a.score}</span>
                                  <small>{a.travel_km} km</small>
                                </td>
                                <td className="reason">{a.reason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </section>
              )}
              {tab === "Sites" && (
                <section className="panel">
                  <h2>Staffing needs</h2>
                  <p className="small">
                    Minimums must be met. Desired counts are goals.
                    {plan ? " Reset the demo to make changes." : ""}
                  </p>
                  <div className="budget-editor">
                    <div>
                      <h3>Extra check-in workers</h3>
                      <p className="small">
                        PollCREW puts them where lines would be longest.
                      </p>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      aria-label="Extra check-in staff budget"
                      disabled={!!plan || !!busy}
                      value={budgetDraft ?? String(current.surge_budget)}
                      onChange={(e) => setBudgetDraft(e.target.value)}
                    />
                    <button
                      className="secondary"
                      disabled={!!plan || !!busy || budgetDraft === null}
                      onClick={async () => {
                        setError("");
                        setNotice("");
                        try {
                          setData(
                            await request(
                              `/jurisdictions/${selected}/budget`,
                              "PUT",
                              { surge_budget: Number(budgetDraft) },
                            ),
                          );
                          setBudgetDraft(null);
                          setNotice("Budget saved.");
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      }}
                    >
                      Save budget
                    </button>
                  </div>
                  {current.locations.map((loc) => (
                    <LocationEditor
                      key={`${formEpoch}-${selected}-${loc.id}`}
                      location={loc}
                      skills={data.skills}
                      locked={!!plan}
                      save={async (l) => {
                        setData(
                          await request(
                            `/jurisdictions/${selected}/locations/${l.id}`,
                            "PUT",
                            l,
                          ),
                        );
                      }}
                    />
                  ))}
                </section>
              )}
              {tab === "Results" && (
                <section className="panel">
                  <h2>How much shorter are the lines?</h2>
                  {plan && current.baseline ? (
                    (() => {
                      const initial = current.before ?? plan;
                      const base = current.baseline;
                      const none = current.curve?.[0]?.even_risk_percent;
                      return (
                        <>
                          <div className="scoreboard">
                            {none != null && (
                              <div>
                                <strong>{none}%</strong>
                                <span>No extra staff</span>
                              </div>
                            )}
                            <div>
                              <strong>
                                {base.simulation.analytic_risk_percent}%
                              </strong>
                              <span>
                                {base.surge_budget} extra, spread evenly
                              </span>
                            </div>
                            <div className="win">
                              <strong>
                                {initial.simulation.analytic_risk_percent}%
                              </strong>
                              <span>
                                Same {initial.surge_budget} extra, placed by
                                PollCREW
                              </span>
                            </div>
                          </div>
                          <p className="small">
                            Chance at least one site has a 30+ minute wait.
                          </p>
                          {current.curve && (
                            <div className="tradeoff">
                              <h3>Same budget, smarter placement</h3>
                              <TradeoffChart
                                curve={current.curve}
                                budget={initial.surge_budget}
                              />
                            </div>
                          )}
                          <h3>Side by side</h3>
                          <div className="table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th />
                                  <th>PollCREW</th>
                                  <th>Simple fill</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td>Spots filled</td>
                                  <td>{Math.round(initial.coverage * 100)}%</td>
                                  <td>{Math.round(base.coverage * 100)}%</td>
                                </tr>
                                <tr>
                                  <td>Average fit</td>
                                  <td>{initial.match_quality}/100</td>
                                  <td>{base.match_quality}/100</td>
                                </tr>
                                <tr>
                                  <td>Minimums met</td>
                                  <td>{initial.minimums_met ? "Yes" : "No"}</td>
                                  <td>{base.minimums_met ? "Yes" : "No"}</td>
                                </tr>
                                <tr>
                                  <td>Extra workers used</td>
                                  <td>
                                    {initial.surge_assigned} of{" "}
                                    {initial.surge_budget}
                                  </td>
                                  <td>
                                    {base.surge_assigned} of {base.surge_budget}
                                  </td>
                                </tr>
                                <tr>
                                  <td>Long-line risk (exact)</td>
                                  <td>
                                    {initial.simulation.analytic_risk_percent}%
                                  </td>
                                  <td>
                                    {base.simulation.analytic_risk_percent}%
                                  </td>
                                </tr>
                                <tr>
                                  <td>Long-line risk (5,000 runs)</td>
                                  <td>{initial.simulation.risk_percent}%</td>
                                  <td>{base.simulation.risk_percent}%</td>
                                </tr>
                                <tr>
                                  <td>Time to plan</td>
                                  <td>{initial.runtime_ms} ms</td>
                                  <td>{base.runtime_ms} ms</td>
                                </tr>
                                {impact?.recovered != null && (
                                  <>
                                    <tr>
                                      <td>Cancellations fixed</td>
                                      <td>
                                        {impact.recovered} /{" "}
                                        {impact.lost_assignments} affected
                                      </td>
                                      <td>
                                        {impact.baseline_recovered} /{" "}
                                        {impact.baseline_affected} affected
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Time to fix</td>
                                      <td>{plan.runtime_ms} ms</td>
                                      <td>{impact.baseline_recovery_ms} ms</td>
                                    </tr>
                                  </>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    <div className="empty">
                      <BarChart3 size={34} />
                      <p>Build the plan to compare.</p>
                    </div>
                  )}
                  <details className="assumptions">
                    <summary>How we measured</summary>
                    <p>
                      Simple fill goes site by site, fills minimums, then
                      desired counts, then hands out extra workers one per site
                      in turn, always picking the best remaining eligible
                      worker. It is not weakened on purpose.
                    </p>
                    <p>
                      Each assigned worker shows up with 92% probability. Voters
                      arrive at a steady random rate and check-in takes 2.5
                      minutes on average (an M/M/c queue). PollCREW computes the
                      exact chance of a 30+ minute wait for every possible
                      check-in count and minimizes the chance that any site goes
                      over, within the extra-staff budget. 5,000 simulated days
                      check that number. No breaks, correlated no-shows, or
                      morning rush are modeled.
                    </p>
                    <p>
                      Matching:{" "}
                      {data.matching_mode === "offline"
                        ? "exact overlap of confirmed skills"
                        : "sentence-embedding similarity of confirmed skills"}
                      , 70% skills and 30% travel distance. Required skills are
                      always hard rules. Timings vary by machine.
                    </p>
                  </details>
                  <details className="assumptions">
                    <summary>Activity log</summary>
                    <ol className="activity">
                      {current.events.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ol>
                  </details>
                </section>
              )}
            </>
          )}
          <footer>
            <span>PollCREW, HackOHI/O 2026</span>
            <span>Demo data only. Built with AI assistance.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
function Stat({
  value,
  label,
  detail,
  tone,
}: {
  value: string;
  label: string;
  detail?: string;
  tone?: "bad";
}) {
  return (
    <section className={tone ? `stat ${tone}` : "stat"}>
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
      {detail && <p>{detail}</p>}
    </section>
  );
}
