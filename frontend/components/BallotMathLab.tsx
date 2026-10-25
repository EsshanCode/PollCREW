"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Activity, Binary, Braces, Sigma } from "lucide-react";
import { DEMO_CANDIDATES, SCENARIOS, type Importance, type WalkthroughResult } from "@/lib/ballot-walkthrough";
import { AGREEMENT_MATRIX, monteCarloDiagnostics, scoreAtSchoolWeight, sensitivity } from "@/lib/ballot-diagnostics";

const ISSUES = ["Schools", "Tax", "Housing"];
const TABS = [
  { label: "Vector algebra", icon: Braces },
  { label: "Monte Carlo", icon: Activity },
  { label: "Sensitivity", icon: Sigma },
  { label: "Information theory", icon: Binary },
];
const percent = (value: number) => `${(value * 100).toFixed(2)}%`;
const signed = (value: number) => `${value >= 0 ? "+" : "−"}${Math.abs(value * 100).toFixed(2)}`;

function Formula({ label, children }: { label: string; children: ReactNode }) {
  return <div className="bm-formula" role="math" aria-label={label}><span aria-hidden="true">{children}</span></div>;
}

function Fraction({ top, bottom }: { top: ReactNode; bottom: ReactNode }) {
  return <span className="bm-fraction"><span>{top}</span><span>{bottom}</span></span>;
}

export function StageEquation({ step }: { step: number }) {
  const titles = ["Ordinal policy encoding", "Normalized importance", "Weighted L₁ geometry", "Monte Carlo estimator", "Identity invariance"];
  return (
    <div className="bm-stage-equation">
      <span className="be-code">{titles[step]}</span>
      {step === 0 && <Formula label="The answer vector u has d coordinates, each chosen from minus two, minus one, zero, one, or two."><b>u</b> ∈ {"{−2, −1, 0, 1, 2}"}<sup>d</sup></Formula>}
      {step === 1 && <Formula label="Normalized importance for issue i is its weight divided by the sum of all weights.">w̄<sub>i</sub> = <Fraction top={<>w<sub>i</sub></>} bottom={<>∑<sub>k</sub> w<sub>k</sub></>} /> <span className="bm-equation-separator">·</span> ∑<sub>i</sub> w̄<sub>i</sub> = 1</Formula>}
      {step === 2 && <Formula label="A candidate's score is one minus the weighted absolute distance divided by four times the total weight.">S<sub>j</sub> = 1 − <Fraction top={<>∑<sub>i</sub> w<sub>i</sub> |u<sub>i</sub> − x<sub>ji</sub>|</>} bottom={<>4 ∑<sub>i</sub> w<sub>i</sub></>} /></Formula>}
      {step === 3 && <Formula label="The estimated first-place share is the number of simulated wins divided by N.">p̂<sub>j</sub> = <Fraction top="1" bottom="N" /> ∑<sub>b=1</sub><sup>N</sup> <span className="bm-math-term">𝟙[j = argmax<sub>k</sub> S<sub>k</sub><sup>(b)</sup>]</span></Formula>}
      {step === 4 && <Formula label="Changing identity metadata does not change the score, which depends only on answers, weights and positions.">m → m′ <span className="bm-equation-separator">⇒</span> S(<b>u</b>, <b>w</b>, <b>X</b>) unchanged</Formula>}
      <a href="#ballot-math-lab">Open the full derivation ↓</a>
    </div>
  );
}

function Matrix({ caption, rows, columns, values, format, heat = false }: {
  caption: string;
  rows: string[];
  columns: string[];
  values: (number | null)[][];
  format: (value: number) => string;
  heat?: boolean;
}) {
  return (
    <table className={`bm-matrix${heat ? " bm-heatmap" : ""}`}>
      <caption>{caption}</caption>
      <thead><tr><th scope="col"><span className="be-sr">Candidate</span></th>{columns.map((column) => <th scope="col" key={column}>{column}</th>)}</tr></thead>
      <tbody>{values.map((row, i) => <tr key={rows[i]}><th scope="row">{rows[i]}</th>{row.map((value, j) => <td key={j} style={heat && value !== null ? { "--cell-strength": (value * 0.18).toFixed(3) } as CSSProperties : undefined}>{value === null ? "—" : format(value)}</td>)}</tr>)}</tbody>
    </table>
  );
}

function Plot({ label, children, start, end }: { label: string; children: ReactNode; start: string; end: string }) {
  return (
    <div className="bm-plot" role="img" aria-label={label}>
      <div className="bm-plot-scale"><span>100%</span><span>0%</span></div>
      <div className="bm-plot-body">
        <svg viewBox="0 0 600 160" preserveAspectRatio="none" aria-hidden="true">
          {[0, 40, 80, 120, 160].map((y) => <line className="bm-gridline" key={y} x1="0" x2="600" y1={y} y2={y} />)}
          {children}
        </svg>
        <div className="bm-plot-axis"><span>{start}</span><span>{end}</span></div>
      </div>
    </div>
  );
}

export default function BallotMathLab({ importance, result, revealed }: {
  importance: Importance;
  result: WalkthroughResult;
  revealed: boolean;
}) {
  const [tab, setTab] = useState(0);
  const [candidate, setCandidate] = useState(0);
  const [samples, setSamples] = useState(SCENARIOS);
  const diagnostics = useMemo(() => monteCarloDiagnostics(result, samples), [result, samples]);
  const local = sensitivity(candidate, importance);
  const labels = DEMO_CANDIDATES.map((c) => revealed ? c.name : c.label);
  const shortLabels = DEMO_CANDIDATES.map((c, i) => revealed ? c.name : String.fromCharCode(65 + i));
  const name = labels[candidate];
  const distribution = diagnostics.distributions[candidate];
  const total = importance + 2;
  const currentShare = diagnostics.shares[candidate];

  return (
    <section className="bm-lab" id="ballot-math-lab" aria-labelledby="math-lab-title">
      <header className="bm-lab-heading">
        <div><span className="bm-kicker">ADDITIONAL FEATURES / DEEP DIVE</span><h2 id="math-lab-title">The math behind the match.</h2><p>Vectors. Perturbations. Derivatives. Every number below is calculated from this fictional example.</p></div>
        <div className="bm-seal" aria-label="Three dimensions, two thousand simulations"><strong>3D</strong><span>× 2,000 runs</span></div>
      </header>
      <div className="bm-switches" role="group" aria-label="Mathematical views">
        {TABS.map(({ label, icon: Icon }, i) => <button type="button" key={label} aria-pressed={tab === i} aria-controls="math-lab-view" onClick={() => setTab(i)}><Icon size={18} aria-hidden />{label}</button>)}
      </div>
      <div className="bm-toolbar">
        <label htmlFor="math-candidate">Inspect candidate<select id="math-candidate" value={candidate} onChange={(event) => setCandidate(Number(event.target.value))}>{labels.map((label, i) => <option key={i} value={i}>{label}</option>)}</select></label>
        <a href="#be-weight">School priority: <strong>{importance} / 3</strong> <span>adjust ↑</span></a>
      </div>

      <div id="math-lab-view" className="bm-view" role="region" aria-label={TABS[tab].label}>
        {tab === 0 && <>
          <div className="bm-panel-grid">
            <article className="bm-panel">
              <span className="bm-index">01 / VECTOR SPACE</span><h3>Turn answers into geometry.</h3>
              <Formula label="The answer vector is two, minus one, one. The candidate position matrix has three rows and three columns."><b>u</b> = (2, −1, 1)<sup>T</sup><br /><b>X</b> ∈ [−2, 2]<sup>3×3</sup></Formula>
              <Matrix caption="Position matrix X" rows={shortLabels} columns={ISSUES} values={DEMO_CANDIDATES.map((c) => [...c.positions])} format={(value) => value > 0 ? `+${value}` : String(value)} />
              <p>Rows are candidates. Columns are policy questions. These are explicit answer coordinates, not inferred language embeddings.</p>
            </article>
            <article className="bm-panel">
              <span className="bm-index">02 / AGREEMENT OPERATOR</span><h3>Distance becomes agreement.</h3>
              <Formula label="Agreement matrix entry j i equals one minus the absolute difference between voter i and candidate j i, divided by four.">A<sub>ji</sub> = 1 − <Fraction top={<>|u<sub>i</sub> − X<sub>ji</sub>|</>} bottom="4" /></Formula>
              <Matrix caption="Agreement matrix A" rows={shortLabels} columns={ISSUES} values={AGREEMENT_MATRIX} format={(value) => value.toFixed(2)} heat />
              <p>1 means identical answers. 0 means opposite ends of the scale. Every cell contributes to the final match.</p>
            </article>
          </div>
          <article className="bm-panel bm-wide-formula">
            <span className="bm-index">03 / MATRIX REDUCTION</span><h3>One multiplication. Three policy scores.</h3>
            <Formula label="The score vector is the agreement matrix times the weight vector, divided by the sum of weights."><b>s</b> = <Fraction top={<><b>A w</b></>} bottom={<><b>1</b><sup>T</sup><b>w</b></>} /> = <b>A w̄</b></Formula>
            <div className="bm-vector-output"><code>w̄ = [{local.normalizedWeights.map((v) => v.toFixed(3)).join(", ")}]</code><strong>s = [{result.scores.map((s) => s.toFixed(4)).join(", ")}]</strong></div>
            <div className="bm-contributions" aria-label={`${name}'s score contributions`}>{local.contributions.map((value, i) => <div key={i}><span>{ISSUES[i]}</span><strong>{(value * 100).toFixed(2)} pp</strong><div className="bm-track"><div style={{ width: `${value * 100}%` }} /></div></div>)}</div>
            <p>{name}: the contributions sum to <strong>{percent(local.score)}</strong>. Equivalently, weighted L₁ distance is <strong>{local.weightedDistance.toFixed(3)}</strong>, so S = 1 − d<sub>w</sub> / 4.</p>
          </article>
        </>}

        {tab === 1 && <>
          <div className="bm-sample-control"><label htmlFor="math-samples">Simulation prefix<output htmlFor="math-samples">{samples.toLocaleString("en-US")} / 2,000</output></label><input id="math-samples" type="range" min="50" max="2000" step="50" value={samples} onChange={(e) => setSamples(Number(e.target.value))} /><p>Scrub through the same seeded runs. The ballot score above stays fixed.</p></div>
          <div className="bm-panel-grid">
            <article className="bm-panel">
              <span className="bm-index">04 / STOCHASTIC PERTURBATION</span><h3>Shake the inputs.</h3>
              <Formula label="Perturbed answers equal clipped original answers plus normal noise with standard deviation point six."><b>u</b><sup>(b)</sup> = clip(<b>u</b> + <b>ε</b>, −2, 2)<br /><b>ε</b> ∼ 𝒩(0, 0.6²<b>I</b>)</Formula>
              <Formula label="Perturbed weights equal original weights times exponentiated normal noise with standard deviation point three five."><b>w</b><sup>(b)</sup> = <b>w</b> ⊙ exp(<b>η</b>)<br /><b>η</b> ∼ 𝒩(0, 0.35²<b>I</b>)</Formula>
              <p>The same noise rules as the matching engine: bounded answer shifts and positive multiplicative weight changes. ⊙ means element-by-element multiplication.</p>
            </article>
            <article className="bm-panel">
              <span className="bm-index">05 / EMPIRICAL ESTIMATOR</span><h3>Count the first-place finishes.</h3>
              <Formula label="Estimated first-place share is the mean of the indicator for candidate j finishing first.">p̂<sub>j</sub> = <Fraction top="1" bottom="N" /> ∑<sub>b=1</sub><sup>N</sup> <span className="bm-math-term">𝟙[rank<sub>j</sub><sup>(b)</sup> = 1]</span></Formula>
              <div className="bm-big-number" data-testid="mc-share">{percent(currentShare)}<span>{name} · {diagnostics.counts[candidate]} / {samples} runs</span></div>
              <Formula label="Estimated Monte Carlo standard error is the square root of p hat times one minus p hat divided by N.">SE(p̂<sub>j</sub>) ≈ √<span className="bm-radicand"><Fraction top={<>p̂<sub>j</sub>(1 − p̂<sub>j</sub>)</>} bottom="N" /></span></Formula>
              <p>Estimated sampling error: <strong>{(diagnostics.standardErrors[candidate] * 100).toFixed(2)} percentage points</strong>. This describes finite simulation sampling, not election uncertainty. Zero hits do not prove zero probability.</p>
            </article>
          </div>
          <div className="bm-panel-grid">
            <article className="bm-panel">
              <span className="bm-index">06 / CONVERGENCE TRACE</span><h3>Watch the estimate settle.</h3>
              <Plot label={`${name} cumulative first-place share through ${samples} runs, ending at ${percent(currentShare)}`} start="1 run" end={`${samples.toLocaleString("en-US")} runs`}>
                <polyline className={`bm-series bm-series-${candidate}`} points={diagnostics.traces.map((p) => `${(p.n - 1) / (samples - 1) * 600},${160 * (1 - p.shares[candidate])}`).join(" ")} />
              </Plot>
              <p>Vertical axis: cumulative first-place share. More draws reduce sampling noise at roughly 1/√N; the trace itself can fluctuate.</p>
            </article>
            <article className="bm-panel">
              <span className="bm-index">07 / SCORE DISTRIBUTION</span><h3>A distribution, not one number.</h3>
              <div className="bm-histogram" role="img" aria-label={`${name} simulated score distribution. Fifth percentile ${percent(distribution.low)}, median ${percent(distribution.median)}, ninety-fifth percentile ${percent(distribution.high)}.`}>
                <svg viewBox="0 0 400 140" preserveAspectRatio="none" aria-hidden="true">{distribution.bins.map((count, i) => <rect className={`bm-bin bm-bin-${candidate}`} key={i} x={i * 20 + 1} y={140 - count / Math.max(...distribution.bins) * 135} width="18" height={count / Math.max(...distribution.bins) * 135} />)}</svg>
                <div className="bm-plot-axis"><span>0% agreement</span><span>100%</span></div>
              </div>
              <div className="bm-distribution-labels"><span>5th<strong>{percent(distribution.low)}</strong></span><span>Median<strong>{percent(distribution.median)}</strong></span><span>95th<strong>{percent(distribution.high)}</strong></span></div>
              <p>Bar height counts runs in each score bin. Percentiles describe scores under the modeled perturbations; they are not a confidence interval for a true candidate score.</p>
            </article>
          </div>
        </>}

        {tab === 2 && <>
          <div className="bm-panel-grid">
            <article className="bm-panel">
              <span className="bm-index">08 / LOCAL GRADIENT</span><h3>Which priority moves the score?</h3>
              <Formula label="The score derivative with respect to an issue weight is that issue's agreement minus the overall score, divided by total weight."><Fraction top={<>∂S<sub>j</sub></>} bottom={<>∂w<sub>i</sub></>} /> = <Fraction top={<>A<sub>ji</sub> − S<sub>j</sub></>} bottom={<>∑<sub>k</sub> w<sub>k</sub></>} /></Formula>
              <div className="bm-number-rows">{local.gradient.map((value, i) => <div key={i}><span>{ISSUES[i]}</span><strong>{signed(value)} pp / weight</strong></div>)}</div>
              <p>Local slope for {name} at w = [{importance}, 1, 1]. It treats weights as continuous to explain direction; the ballot still offers discrete priorities 1–3.</p>
            </article>
            <article className="bm-panel">
              <span className="bm-index">09 / LEAVE-ONE-OUT</span><h3>Remove an issue. Rebalance.</h3>
              <Formula label="The score without issue i equals total weight times score minus issue i's weighted agreement, divided by the remaining weight.">S<sub>j,−i</sub> = <Fraction top={<>W S<sub>j</sub> − w<sub>i</sub>A<sub>ji</sub></>} bottom={<>W − w<sub>i</sub></>} /></Formula>
              <div className="bm-number-rows">{local.ablations.map((value, i) => <div key={i}><span>Without {ISSUES[i].toLowerCase()}</span><strong>{percent(value)}<small>{signed(value - local.score)} pp</small></strong></div>)}</div>
              <p>W = {total}. This hypothetical ablation shows each issue’s influence on {name}; it does not remove any answer from your ballot.</p>
            </article>
          </div>
          <article className="bm-panel">
            <span className="bm-index">10 / DECISION BOUNDARY</span><h3>The exact point where the leaders swap.</h3>
            <Formula label="For candidates A and B, the score difference is point two five times the school weight minus point five, divided by the school weight plus two.">S<sub>A</sub> − S<sub>B</sub> = <Fraction top={<>0.25w<sub>school</sub> − 0.5</>} bottom={<>w<sub>school</sub> + 2</>} /> = 0 <span className="bm-equation-separator">⇒</span> w* = 2</Formula>
            <Plot label="Scores as school importance varies from one to three. A and B tie at weight two. C stays below both." start="School weight 1" end="School weight 3">
              <line className="bm-current-weight" x1={(importance - 1) / 2 * 600} x2={(importance - 1) / 2 * 600} y1="0" y2="160" />
              {DEMO_CANDIDATES.map((_, i) => <polyline key={i} className={`bm-series bm-series-${i}`} points={Array.from({ length: 81 }, (_, n) => `${n / 80 * 600},${160 * (1 - scoreAtSchoolWeight(i, 1 + n / 40))}`).join(" ")} />)}
            </Plot>
            <div className="bm-legend">{labels.map((label, i) => <span key={i}><i className={`bm-bin-${i}`} />{label}: {percent(result.scores[i])}</span>)}</div>
            <p>The shaded marker is the current school priority. Below 2, B leads; above 2, A leads. This boundary is specific to these fictional profiles.</p>
          </article>
        </>}

        {tab === 3 && <>
          <p className="bm-scope">Using the first <strong>{samples.toLocaleString("en-US")}</strong> of the same 2,000 runs. Change the prefix in the Monte Carlo view.</p>
          <div className="bm-panel-grid">
            <article className="bm-panel">
              <span className="bm-index">11 / SHANNON ENTROPY</span><h3>How split are the simulated winners?</h3>
              <Formula label="Winner entropy is minus the sum over candidates of first-place share times its base two logarithm.">H = −∑<sub>j</sub> p̂<sub>j</sub> log<sub>2</sub> p̂<sub>j</sub></Formula>
              <div className="bm-big-number" data-testid="winner-entropy">{diagnostics.entropy.toFixed(3)}<span>bits · maximum log₂3 ≈ 1.585</span></div>
              <Formula label="Effective number of first-place contenders equals two raised to the entropy.">N<sub>eff</sub> = 2<sup>H</sup> = {diagnostics.effectiveContenders.toFixed(2)}</Formula>
              <p>0 bits means one candidate takes every simulated first place. log₂3 means an even three-way split. This measures modeled rank dispersion, not voter diversity or election odds. Use 0 log₂0 = 0.</p>
            </article>
            <article className="bm-panel">
              <span className="bm-index">12 / RANK OCCUPANCY</span><h3>Every candidate. Every rank.</h3>
              <Formula label="Rank occupancy j r is the fraction of simulations where candidate j finishes at rank r.">R<sub>jr</sub> = <Fraction top="1" bottom="N" /> ∑<sub>b</sub> <span className="bm-math-term">𝟙[rank<sub>j</sub><sup>(b)</sup> = r]</span></Formula>
              <Matrix caption="Share of runs at each rank" rows={shortLabels} columns={["1st", "2nd", "3rd"]} values={diagnostics.rankCounts.map((row) => row.map((n) => n / samples))} format={(v) => `${(v * 100).toFixed(1)}%`} heat />
              <p>Each row and column totals 100% before rounding. A candidate can rarely finish first yet consistently finish second.</p>
            </article>
          </div>
          <article className="bm-panel">
            <span className="bm-index">13 / PAIRWISE DOMINANCE</span><h3>Who outranks whom?</h3>
            <Formula label="Pairwise outrank share j k is the fraction of simulations in which candidate j scores above candidate k after the tiny tie-break jitter.">P<sub>jk</sub> = <Fraction top="1" bottom="N" /> ∑<sub>b</sub> <span className="bm-math-term">𝟙[S̃<sub>j</sub><sup>(b)</sup> &gt; S̃<sub>k</sub><sup>(b)</sup>]</span></Formula>
            <Matrix caption="Row candidate finishes ahead of column candidate" rows={shortLabels} columns={shortLabels} values={diagnostics.pairwiseCounts.map((row, i) => row.map((n, j) => i === j ? null : n / samples))} format={(v) => `${(v * 100).toFixed(1)}%`} heat />
            <p>S̃ includes the simulation’s tiny random tie-break jitter. Opposing cells sum to 100% before rounding. These comparisons describe this model’s what-ifs, not an electorate.</p>
          </article>
        </>}
      </div>
      <footer className="bm-lab-foot"><span>Computed locally · Same fictional profiles</span><span>Diagnostic views explain the score. They do not alter the ranking rule.</span></footer>
    </section>
  );
}
