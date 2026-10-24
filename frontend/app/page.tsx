"use client";
import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  Globe2,
  LayoutDashboard,
  MapPin,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { AppState } from "@/components/types";
import WorkerEditor from "@/components/WorkerEditor";
import LocationEditor from "@/components/LocationEditor";
const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => <div className="map loading">Loading map…</div>,
});
const RiskChart = dynamic(() => import("@/components/RiskChart"), {
  ssr: false,
  loading: () => <p>Loading risk chart…</p>,
});
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
            : "Check your inputs: minimums must not exceed desired staffing, and shift end must follow start.",
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
            "Cannot reach the demo server. Start the FastAPI backend on port 8000, then reload.",
          );
      }
    }
    init();
    return () => {
      active = false;
    };
  }, []);
  async function action(name: string, path: string, body?: unknown) {
    setBusy(name);
    setError("");
    setNotice("");
    try {
      setData(await request(path, "POST", body));
      if (path === "/reset") setFormEpoch((n) => n + 1);
      setNotice(`${name} complete.`);
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
  const workers = current?.workers ?? [];
  const worker = workers.find((w) => w.id === workerId) ?? workers[1];
  const totalWorkers =
    data?.jurisdictions.reduce((n, j) => n + j.workers.length, 0) ?? 0;
  const totalLocations =
    data?.jurisdictions.reduce((n, j) => n + j.locations.length, 0) ?? 0;
  const tabs = [
    "Overview",
    "Workers",
    "Assignments",
    "Requirements",
    "Evaluation",
  ];
  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="PollCREW home">
          <span className="brand-mark">
            <Check size={25} strokeWidth={3} />
          </span>
          Poll<span>CREW</span>
        </a>
        <p className="brand-sub">PEOPLE MAKE ELECTIONS WORK</p>
        <div className="workspace-label">COORDINATOR WORKSPACE</div>
        <button
          className={!selected ? "nav active" : "nav"}
          onClick={() => select("")}
        >
          <Globe2 size={19} />
          National overview
        </button>
        <div className="workspace-label">DEMO JURISDICTIONS</div>
        {data?.jurisdictions.map((j) => (
          <button
            key={j.jurisdiction.id}
            className={selected === j.jurisdiction.id ? "nav active" : "nav"}
            onClick={() => select(j.jurisdiction.id)}
          >
            <span className="state-code">{j.jurisdiction.code}</span>
            <span>
              {j.jurisdiction.name}
              <small>{j.jurisdiction.state}</small>
            </span>
          </button>
        ))}
        <div className="sidebar-bottom">
          <ShieldCheck size={23} />
          <strong>Nonpartisan by design</strong>
          <p>Operational staffing, centered on people.</p>
          <div className="demo-tag">SYNTHETIC DEMO</div>
          <p>No live election data.</p>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />{" "}
            {current?.jurisdiction.name ?? "United States"}
          </div>
          <div className="top-actions">
            <span className="pill demo-pill">
              <span className="dot" />
              Hackathon sandbox
            </span>
            <button
              className="text-button"
              disabled={!!busy || !data}
              onClick={() => {
                setWorkerId("");
                action("Reset demo", "/reset");
              }}
            >
              <RotateCcw size={15} />
              Reset demo
            </button>
            <span className="avatar">CO</span>
          </div>
        </header>
        <div className="content">
          <div className="heading-row">
            <div>
              <div className="eyebrow">
                {current
                  ? `${current.jurisdiction.state.toUpperCase()} · SYNTHETIC JURISDICTION`
                  : "COORDINATED ROUTING OF ELECTION WORKERS"}
              </div>
              <h1>
                {current
                  ? current.jurisdiction.name
                  : "Every location. The right crew."}
              </h1>
              <p className="subtitle">
                {current
                  ? "Turn confirmed skills into a staffing plan you can explain."
                  : "A national perspective. A local plan. Bring people and polling places together."}
              </p>
            </div>
            {current && (
              <button className="secondary" onClick={() => select("")}>
                <Globe2 size={16} />
                US overview
              </button>
            )}
          </div>
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
            {notice && !busy && <div className="success">{notice}</div>}
          </div>
          {!data ? (
            <div className="panel loading">
              {error
                ? "The demo needs its local backend."
                : "Preparing your reproducible demo…"}
            </div>
          ) : (
            <>
              {!current ? (
                <>
                  <div className="stats">
                    <Stat
                      icon={<Globe2 />}
                      value="3"
                      label="Demo jurisdictions"
                      detail="Across three US states"
                    />
                    <Stat
                      icon={<Users />}
                      value={`${totalWorkers}`}
                      label="Synthetic workers"
                      detail="Confirmed skills, individual availability"
                    />
                    <Stat
                      icon={<MapPin />}
                      value={`${totalLocations}`}
                      label="Voting locations"
                      detail="24 distinct precincts"
                    />
                    <Stat
                      icon={<BarChart3 />}
                      value="5,000"
                      label="No-show scenarios"
                      detail="Seeded, repeatable risk analysis"
                    />
                  </div>
                  <div className="national-grid">
                    <section className="panel map-panel">
                      <div className="section-heading">
                        <div>
                          <h2>Local readiness, national view</h2>
                          <p>Select a demo jurisdiction to get started.</p>
                        </div>
                        <span className="pill">United States</span>
                      </div>
                      <Map
                        data={data.jurisdictions}
                        selected=""
                        onSelect={select}
                      />
                      <div className="map-legend">
                        <span>
                          <i className="legend-dot" />
                          Demo jurisdiction
                        </span>
                        <span>
                          Only marked jurisdictions have synthetic data.
                        </span>
                      </div>
                    </section>
                    <section className="panel intro-panel">
                      <span className="eyebrow">
                        FROM EXPERIENCE TO READINESS
                      </span>
                      <h2>A better plan starts with your people.</h2>
                      <p>
                        Confirm what workers can do. Build the crew. Recover
                        when plans change.
                      </p>
                      <ol className="steps">
                        <li>
                          <span>01</span>
                          <div>
                            <strong>Confirm skills</strong>
                            <p>Review suggestions with supporting text.</p>
                          </div>
                        </li>
                        <li>
                          <span>02</span>
                          <div>
                            <strong>Build an explainable plan</strong>
                            <p>Match operational needs and availability.</p>
                          </div>
                        </li>
                        <li>
                          <span>03</span>
                          <div>
                            <strong>Adapt with confidence</strong>
                            <p>Replace cancellations. Keep the rest intact.</p>
                          </div>
                        </li>
                      </ol>
                      <button
                        onClick={() =>
                          select(data.jurisdictions[0].jurisdiction.id)
                        }
                      >
                        Open demo jurisdiction <ArrowRight size={17} />
                      </button>
                    </section>
                  </div>
                  <div className="section-heading jurisdiction-heading">
                    <div>
                      <h2>Choose your jurisdiction</h2>
                      <p>One staffing engine. Different local needs.</p>
                    </div>
                    <label className="state-filter">
                      State
                      <select
                        aria-label="Filter jurisdictions by state"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        <option value="">All demo states</option>
                        {data.jurisdictions.map((j) => (
                          <option
                            key={j.jurisdiction.code}
                            value={j.jurisdiction.code}
                          >
                            {j.jurisdiction.state}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="jurisdiction-cards">
                    {data.jurisdictions
                      .filter((j) => !filter || j.jurisdiction.code === filter)
                      .map((j, i) => (
                        <button
                          className="jurisdiction-card"
                          key={j.jurisdiction.id}
                          onClick={() => select(j.jurisdiction.id)}
                        >
                          <div className={`state-art art-${i}`}>
                            <span>{j.jurisdiction.code}</span>
                            <MapPin size={28} />
                          </div>
                          <div className="card-body">
                            <span className="eyebrow">
                              {j.jurisdiction.state}
                            </span>
                            <h3>
                              {j.jurisdiction.name}
                              <ArrowRight size={18} />
                            </h3>
                            <p>
                              50 workers <span>·</span> 4 voting locations
                            </p>
                            <span className="small">
                              {j.plan
                                ? `${Math.round(j.plan.coverage * 100)}% staffed · ${j.plan.approved ? "Approved" : "Review pending"}`
                                : "Ready to build a staffing plan"}
                            </span>
                          </div>
                        </button>
                      ))}
                  </div>
                </>
              ) : (
                <>
                  <nav className="tabs" aria-label="Jurisdiction sections">
                    {tabs.map((t) => (
                      <button
                        className={tab === t ? "selected" : ""}
                        key={t}
                        onClick={() => setTab(t)}
                      >
                        {t === "Overview" && <LayoutDashboard size={16} />}
                        {t === "Workers" && <Users size={16} />}
                        {t === "Assignments" && <CheckCircle2 size={16} />}
                        {t === "Evaluation" && <BarChart3 size={16} />}
                        {t}
                      </button>
                    ))}
                  </nav>
                  <div className="workflow">
                    <div className={plan ? "done" : "current"}>
                      <span>1</span> Confirm skills
                    </div>
                    <ChevronRight size={15} />
                    <div
                      className={
                        plan?.approved || current.impact ? "done" : "current"
                      }
                    >
                      <span>2</span> Generate & approve
                    </div>
                    <ChevronRight size={15} />
                    <div
                      className={
                        current.impact?.recovered != null ? "done" : ""
                      }
                    >
                      <span>3</span> Recover cancellations
                    </div>
                    <ChevronRight size={15} />
                    <div
                      className={
                        current.impact?.recovered != null && plan?.approved
                          ? "done"
                          : ""
                      }
                    >
                      <span>4</span> Approve revision
                    </div>
                  </div>
                  <div className="stats">
                    <Stat
                      icon={<Users />}
                      value={`${workers.filter((w) => !w.cancelled).length}`}
                      label="Available pool"
                      detail={`${workers.filter((w) => w.cancelled).length} cancelled · eligibility checked per role`}
                    />
                    <Stat
                      icon={<CheckCircle2 />}
                      value={plan ? `${Math.round(plan.coverage * 100)}%` : "—"}
                      label="Staffing coverage"
                      detail={
                        plan
                          ? `${plan.assignments.length} of ${plan.needed} desired positions`
                          : "Generate a plan to measure"
                      }
                    />
                    <Stat
                      icon={<BarChart3 />}
                      value={plan ? `${plan.simulation.risk_percent}%` : "—"}
                      label="Modeled queue risk"
                      detail="Scenarios with expected wait >30 min"
                    />
                    <Stat
                      icon={<ShieldCheck />}
                      value={
                        plan?.approved
                          ? "Approved"
                          : plan?.disrupted
                            ? "Disrupted"
                            : plan
                              ? "Review"
                              : "Draft"
                      }
                      label="Plan status"
                      detail={`Revision ${current.revision} · coordinator controlled`}
                    />
                  </div>
                  <div className="action-strip">
                    <div>
                      <strong>
                        {plan?.disrupted
                          ? "Three workers cancelled. Your next move is ready."
                          : !plan
                            ? "Ready to build your crew?"
                            : plan.approved
                              ? "Plan approved inside the demo."
                              : "Review assignments before approving."}
                      </strong>
                      <p>
                        {plan?.disrupted
                          ? `${current.impact?.preserved} unaffected assignments stay locked during recovery.`
                          : !plan
                            ? "Review worker profiles and requirements, then let the solver build a plan."
                            : "Every match is checked against your configured operational requirements."}
                      </p>
                    </div>
                    <div className="button-row">
                      {!plan && (
                        <button
                          disabled={!!busy}
                          onClick={() =>
                            action(
                              "Generate assignments",
                              `/jurisdictions/${selected}/generate`,
                            )
                          }
                        >
                          <Sparkles size={16} />
                          Generate assignments
                        </button>
                      )}
                      {plan && !plan.approved && !plan.disrupted && (
                        <button
                          disabled={!!busy}
                          onClick={() =>
                            action(
                              "Approve plan",
                              `/jurisdictions/${selected}/approve`,
                              { revision: current.revision },
                            )
                          }
                        >
                          <Check size={17} />
                          {current.impact
                            ? "Approve revised plan"
                            : "Approve plan"}
                        </button>
                      )}
                      {plan?.approved && !current.impact && (
                        <button
                          className="warning-button"
                          disabled={!!busy}
                          onClick={() =>
                            action(
                              "Cancel three workers",
                              `/jurisdictions/${selected}/cancel`,
                            )
                          }
                        >
                          <Zap size={16} />
                          Simulate 3 cancellations
                        </button>
                      )}
                      {plan?.disrupted && (
                        <button
                          disabled={!!busy}
                          onClick={() =>
                            action(
                              "Recover with backups",
                              `/jurisdictions/${selected}/recover`,
                            )
                          }
                        >
                          Recover with backups <ArrowRight size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  {current.impact && (
                    <section className="impact">
                      <strong>Cancellation recovery</strong>
                      <span>
                        3 cancelled: {current.impact.cancelled_ids.join(", ")}
                      </span>
                      <span>
                        {current.impact.preserved} assignments preserved
                      </span>
                      <span>
                        {current.impact.recovered == null
                          ? "Backups not yet assigned"
                          : `${current.impact.recovered} replacements assigned`}
                      </span>
                      <span>
                        Risk: {current.impact.before_risk}% →{" "}
                        {current.impact.after_risk}% after cancellations
                        {current.impact.recovered != null
                          ? ` → ${plan?.simulation.risk_percent}% after recovery`
                          : ""}
                      </span>
                    </section>
                  )}
                  {tab === "Overview" && (
                    <>
                      <div className="national-grid">
                        <section className="panel map-panel">
                          <div className="section-heading">
                            <div>
                              <h2>Voting locations</h2>
                              <p>
                                Physical sites, with their associated precincts.
                              </p>
                            </div>
                            <span className="pill">4 locations</span>
                          </div>
                          <Map
                            data={data.jurisdictions}
                            selected={selected}
                            onSelect={select}
                          />
                          <div className="map-legend">
                            <span>
                              <i className="legend-dot" />
                              Desired coverage met
                            </span>
                            <span>
                              <i className="legend-dot amber" />
                              Unfilled positions
                            </span>
                            <span>
                              <i className="legend-dot gray" />
                              Not planned
                            </span>
                          </div>
                          <p className="map-note">
                            Synthetic coordinates · external basemap ·
                            straight-line travel estimate
                          </p>
                        </section>
                        <section className="panel">
                          <div className="section-heading">
                            <div>
                              <h2>Queue risk</h2>
                              <p>Check-in staffing drives this model.</p>
                            </div>
                          </div>
                          {plan ? (
                            <>
                              <RiskChart simulation={plan.simulation} />
                              <p className="small">
                                5,000 seeded no-show scenarios. Percentage with
                                modeled expected wait &gt;30 minutes at each
                                site, including unstable queues.
                              </p>
                              <p className="small">
                                Not an individual voter’s probability of waiting
                                &gt;30 minutes.
                              </p>
                            </>
                          ) : (
                            <div className="empty">
                              <BarChart3 size={36} />
                              <h3>See the impact of your plan</h3>
                              <p>
                                Generate assignments to calculate location-level
                                queue risk.
                              </p>
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
                          return (
                            <section
                              className="panel location-card"
                              key={loc.id}
                            >
                              <div className="section-heading">
                                <MapPin size={20} />
                                <span className="pill">
                                  {assigned.length}/{need} staffed
                                </span>
                              </div>
                              <h3>{loc.name}</h3>
                              <p className="small">
                                Precincts {loc.precincts.join(" · ")}
                              </p>
                              <div className="progress">
                                <span
                                  style={{
                                    width: `${need ? (assigned.length / need) * 100 : 100}%`,
                                  }}
                                />
                              </div>
                              <div className="role-counts">
                                {loc.requirements.map((r) => (
                                  <div key={r.role}>
                                    <span>{r.role}</span>
                                    <strong>
                                      {
                                        assigned.filter(
                                          (a) => a.role === r.role,
                                        ).length
                                      }
                                      /{r.desired}
                                    </strong>
                                  </div>
                                ))}
                              </div>
                              {risk && (
                                <p className="small">
                                  Risk scenarios:{" "}
                                  <strong>{risk.risk_percent}%</strong>
                                  <br />
                                  Unstable: {risk.unstable_percent}% · Zero
                                  staff: {risk.zero_staff_percent}%<br />
                                  All-attend expected wait:{" "}
                                  {risk.all_attend_expected_wait_minutes ===
                                  null
                                    ? "Unstable / no finite steady-state wait"
                                    : `${risk.all_attend_expected_wait_minutes} min`}
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
                        <h2>Worker roster</h2>
                        <p className="small">
                          50 synthetic profiles · choose one to review
                        </p>
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
                                {w.id} · {w.confirmed_skills.length} confirmed
                                skills
                              </small>
                            </span>
                            {w.cancelled && (
                              <span className="cancelled">Cancelled</span>
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
                  {tab === "Assignments" && (
                    <section className="panel">
                      <div className="section-heading">
                        <div>
                          <h2>Every assignment has a reason</h2>
                          <p>
                            Confirmed skills, full-shift availability, training,
                            and travel.
                          </p>
                        </div>
                        <span className="pill">
                          {plan?.assignments.length ?? 0} assignments
                        </span>
                      </div>
                      {!plan ? (
                        <div className="empty">
                          Generate assignments to review matches.
                        </div>
                      ) : (
                        <>
                          {plan.gaps.length > 0 && (
                            <div className="notice">
                              {plan.gaps
                                .map(
                                  (g) =>
                                    `${g.location}: ${g.unfilled} unfilled ${g.role}`,
                                )
                                .join(" · ")}
                            </div>
                          )}
                          <div className="table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>Worker</th>
                                  <th>Location / role</th>
                                  <th>Match</th>
                                  <th>Why this match</th>
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
                                      <span className="score">
                                        {a.score}/100
                                      </span>
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
                  {tab === "Requirements" && (
                    <section className="panel">
                      <h2>Configure operational requirements</h2>
                      <p>
                        These are coordinator choices, not legal rules. Minimum
                        counts are hard constraints; desired counts are
                        optimization targets.
                      </p>
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
                  {tab === "Evaluation" && (
                    <section className="panel">
                      <h2>Measured against a simple baseline</h2>
                      <p>
                        Same workers, requirements, eligibility checks, quality
                        score, attendance seed, and 5,000 simulation runs.
                      </p>
                      {plan && current.baseline ? (
                        <>
                          <div className="table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>Metric</th>
                                  <th>
                                    {current.before
                                      ? "Initial optimized plan"
                                      : "Optimized plan"}
                                  </th>
                                  <th>Greedy baseline</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td>Coverage</td>
                                  <td>
                                    {Math.round(
                                      (current.before ?? plan).coverage * 100,
                                    )}
                                    %
                                  </td>
                                  <td>
                                    {Math.round(
                                      current.baseline.coverage * 100,
                                    )}
                                    %
                                  </td>
                                </tr>
                                <tr>
                                  <td>Mean match quality</td>
                                  <td>
                                    {(current.before ?? plan).match_quality}/100
                                  </td>
                                  <td>{current.baseline.match_quality}/100</td>
                                </tr>
                                <tr>
                                  <td>Eligibility & score preparation</td>
                                  <td>
                                    {(current.before ?? plan).preparation_ms} ms
                                  </td>
                                  <td>{current.baseline.preparation_ms} ms</td>
                                </tr>
                                <tr>
                                  <td>Assignment selection runtime</td>
                                  <td>
                                    {(current.before ?? plan).runtime_ms} ms
                                  </td>
                                  <td>{current.baseline.runtime_ms} ms</td>
                                </tr>
                                <tr>
                                  <td>Configured minimums met</td>
                                  <td>
                                    {(current.before ?? plan).minimums_met
                                      ? "Yes"
                                      : "No"}
                                  </td>
                                  <td>
                                    {current.baseline.minimums_met
                                      ? "Yes"
                                      : "No"}
                                  </td>
                                </tr>
                                <tr>
                                  <td>Queue-risk scenarios</td>
                                  <td>
                                    {
                                      (current.before ?? plan).simulation
                                        .risk_percent
                                    }
                                    %
                                  </td>
                                  <td>
                                    {current.baseline.simulation.risk_percent}%
                                  </td>
                                </tr>
                                {current.impact?.recovered != null && (
                                  <>
                                    <tr>
                                      <td>Cancellation recovery</td>
                                      <td>
                                        {current.impact.recovered} / 3 affected
                                      </td>
                                      <td>
                                        {current.impact.baseline_recovered} /{" "}
                                        {current.impact.baseline_affected}{" "}
                                        affected
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Recovery runtime</td>
                                      <td>{plan.runtime_ms} ms</td>
                                      <td>
                                        {current.impact.baseline_recovery_ms} ms
                                      </td>
                                    </tr>
                                  </>
                                )}
                              </tbody>
                            </table>
                          </div>
                          <p className="small">
                            Baseline: process locations and roles in fixed
                            order, fill minimums first, then desired counts;
                            choose the highest-scoring remaining eligible worker
                            at each step. It can fail a minimum because it does
                            not globally reserve scarce skills. No baseline is
                            deliberately weakened.
                          </p>
                          <p className="small">
                            Recovery applies the same cancelled worker IDs to
                            both initial plans and locks each plan’s unaffected
                            assignments. Different initial assignments can mean
                            different affected counts. Selection runtime
                            excludes eligibility, score preparation, model
                            loading, and queue simulation. Preparation is
                            reported separately and depends on the model cache.
                            Timings vary by machine.
                          </p>
                        </>
                      ) : (
                        <div className="empty">
                          Generate a plan to run the comparison.
                        </div>
                      )}
                      <details className="assumptions">
                        <summary>Model assumptions and limitations</summary>
                        <p>
                          Independent 92% attendance per assigned worker.
                          Constant, jurisdiction-specific Poisson arrivals.
                          Exponential service times averaging 2.5 minutes by
                          default. M/M/c steady-state expected wait with c equal
                          to attending check-in workers. Zero servers with
                          positive demand and arrival rates at or above service
                          capacity are explicitly unstable (infinite modeled
                          wait). No finite-day queue buildup, correlated
                          no-shows, breaks, or empirical calibration is modeled.
                        </p>
                        <p>
                          Matching mode:{" "}
                          {data.matching_mode === "offline"
                            ? "Offline exact confirmed-skill overlap"
                            : "Sentence-transformers contextual similarity of confirmed skill descriptions"}
                          . Scores combine 70% skill similarity and 30% travel
                          proximity. Required skills remain hard checks in both
                          modes.
                        </p>
                      </details>
                      <h3>Demo activity</h3>
                      <ol className="activity">
                        {current.events.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ol>
                    </section>
                  )}
                </>
              )}
              <footer>
                <span>PollCREW · Hack/OHIO 2026</span>
                <span>
                  Synthetic data only ·{" "}
                  {data.extraction_mode === "offline"
                    ? "Offline extraction demo"
                    : "AI extraction enabled"}{" "}
                  ·{" "}
                  {data.matching_mode === "offline"
                    ? "Exact-skill matching"
                    : "Contextual skill matching"}
                </span>
                <span>Built with AI assistance</span>
              </footer>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
function Stat({
  icon,
  value,
  label,
  detail,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  detail: string;
}) {
  return (
    <section className="stat">
      <div className="stat-top">
        <span>{label}</span>
        {icon}
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </section>
  );
}
