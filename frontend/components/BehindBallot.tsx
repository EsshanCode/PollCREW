"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Mascot } from "./Brand";
import BallotProcessCanvas from "./BallotProcessCanvas";
import {
  agreement,
  calculateWalkthrough,
  DEMO_CANDIDATES,
  DEMO_ANSWERS,
  SCENARIOS,
  type Importance,
} from "@/lib/ballot-walkthrough";

const STEPS = [
  {
    label: "Encode",
    kicker: "POLICY VECTOR",
    title: "Your answers become coordinates.",
    process: "3 dimensions",
    caption: "Same questions. Same scale.",
    description: "Your selected answers are encoded from −2 to +2. Each coordinate stays attached to its original policy question.",
    next: "Apply priorities",
    readLabel: "YOUR POLICY VECTOR",
    readNote: "Schools · Tax tradeoffs · Housing",
  },
  {
    label: "Weight",
    kicker: "IMPORTANCE WEIGHTS",
    title: "Your priorities shape the calculation.",
    process: "Weighted agreement",
    caption: "Importance changes influence.",
    description: "",
    next: "Compare positions",
    readLabel: "IMPORTANCE VECTOR",
    readNote: "Your priorities determine each issue’s share",
  },
  {
    label: "Compare",
    kicker: "DISTANCE → AGREEMENT",
    title: "Every difference becomes a score.",
    process: "Identity excluded",
    caption: "Closer positions contribute more.",
    description: "Each issue earns 1 − |your answer − their answer| ÷ 4. The engine averages those agreements using your importance weights. Names, party and money do not enter this score.",
    next: "Run the stress test",
    readLabel: "TOP AGREEMENT",
    readNote: "Agreement across all three answered demo issues",
  },
  {
    label: "Stress-test",
    kicker: "MONTE CARLO",
    title: "One match. Two thousand what-ifs.",
    process: "2,000 / 2,000 computed",
    caption: "Does the match hold when answers shift?",
    description: "Each point is one calculated scenario with small changes to your positions and priorities. Its color records who ranked first. This tests sensitivity; it does not predict an election.",
    next: "Reveal the result",
    readLabel: "MOST OFTEN FIRST",
    readNote: "Share of 2,000 modeled scenarios · not election odds",
  },
  {
    label: "Reveal",
    kicker: "IDENTITY REVEAL",
    title: "The names appear. The math stays.",
    process: "Scoring unchanged",
    caption: "Identity comes after comparison.",
    description: "The same scores are now attached to the fictional candidate names. In the ballot flow, names, party, spending and endorsements appear after the policy comparison.",
    next: "Replay the process",
    readLabel: "POLICY MATCH",
    readNote: "Fictional example · no real candidates",
  },
] as const;

export default function BehindBallot() {
  const [step, setStep] = useState(0);
  const [importance, setImportance] = useState<Importance>(2);
  const result = useMemo(() => calculateWalkthrough(importance), [importance]);
  const current = STEPS[step];
  const number = String(step + 1).padStart(2, "0");
  const readValue = step === 0 ? "[ +2, −1, +1 ]"
    : step === 1 ? `[ ${importance}, 1, 1 ]`
    : step === 3 ? `${(Math.max(...result.counts) / SCENARIOS * 100).toFixed(1)}%`
    : `${(Math.max(...result.scores) * 100).toFixed(2)}%`;
  const description = step === 1
    ? `The school-funding answer counts ${importance} ${importance === 1 ? "time" : "times"}. Tax and housing answers each count once. Move the slider below to see that influence change.`
    : current.description;
  const candidateLabel = (i: number) => step === 4 ? DEMO_CANDIDATES[i].name : DEMO_CANDIDATES[i].label;
  const canvasSummary = step === 3
    ? `Two thousand calculated scenarios. ${result.counts.map((n, i) => `${DEMO_CANDIDATES[i].label} ranks first in ${n}`).join(", ")}.`
    : `${current.title} ${current.caption}`;

  return (
    <div className="be-main">
      <section className="be-hero" aria-labelledby="walkthrough-title">
        <div className="be-hero-copy">
          <div className="be-overline">Additional features</div>
          <h1 id="walkthrough-title">Open the<br /><em>engine room.</em></h1>
          <div className="be-intro">
            Go behind the ballot. Watch your answers become coordinates, priorities, and a policy match.
            <span className="be-demo">Interactive walkthrough · Fictional example</span>
          </div>
        </div>
        <div className="be-mascot"><Mascot size={170} blindfold /></div>
      </section>

      <nav className="be-steps" aria-label="Steps in the matching process">
        {STEPS.map((item, i) => (
          <button key={item.label} type="button" aria-pressed={step === i} aria-controls="ballot-process" onClick={() => setStep(i)}>
            <span>{String(i + 1).padStart(2, "0")}</span>{item.label}
          </button>
        ))}
      </nav>

      <section className="be-chamber" id="ballot-process" aria-labelledby="be-stage-title">
        <div className="be-chamber-top">
          <div><span className="be-code" id="be-stage-kicker">{number} / {current.kicker}</span><h2 id="be-stage-title">{current.title}</h2></div>
          <span className="be-code be-process-label">MATCHING ENGINE<span>{current.process}</span></span>
        </div>
        <div className="be-view">
          <BallotProcessCanvas step={step} importance={importance} result={result} summary={canvasSummary} />
          <div className="be-readout">
            <span className="be-code">{current.readLabel}</span><strong>{readValue}</strong><span>{current.readNote}</span>
          </div>
        </div>
        <div className="be-explanation">
          <span className="be-step-number">{number}</span>
          <div><strong>{current.caption}</strong><p>{description}</p></div>
        </div>
        <div className="be-controls">
          <button type="button" className="be-secondary" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft size={17} aria-hidden />Previous</button>
          <span className="be-code" id="be-step-count">STEP {number} / 05</span>
          <button type="button" className="be-primary" onClick={() => setStep((step + 1) % STEPS.length)}>{current.next}<ArrowUpRight size={22} aria-hidden /></button>
        </div>
      </section>

      <section className="be-inspector" aria-labelledby="inspector-title">
        <div className="be-inspector-title"><h2 className="be-code" id="inspector-title">Inspect this example</h2><span className="be-small">Change one priority. Follow the result.</span></div>
        <div className="be-inspector-grid">
          <div className="be-priorities">
            <label htmlFor="be-weight">School funding importance<output htmlFor="be-weight">{importance} / 3</output></label>
            <input id="be-weight" aria-valuetext={`${importance} of 3: ${["A little", "Somewhat", "A lot"][importance - 1]}`} type="range" min="1" max="3" step="1" value={importance} onChange={(e) => setImportance(Number(e.target.value) as Importance)} />
            <div className="be-range-labels"><span>A little</span><span>Somewhat</span><span>A lot</span></div>
            <div className="be-vector-label"><span>Importance vector</span><code>w = [{importance}, 1, 1]</code></div>
          </div>
          <div className="be-results" aria-label="Calculated agreement for fictional candidates">
            {DEMO_CANDIDATES.map((candidate, i) => (
              <div className="be-result-row" key={candidate.label}>
                <span>{candidateLabel(i)}</span><div className="be-bar" aria-hidden><div className="be-fill" style={{ width: `${result.scores[i] * 100}%` }} /></div><strong>{(result.scores[i] * 100).toFixed(1)}%</strong>
              </div>
            ))}
          </div>
        </div>
        <details className="be-math">
          <summary>Inspect the actual math <span>Σ wᵢ · agreementᵢ / Σ wᵢ</span></summary>
          <div id="be-math-body">
            <p><strong>Three explicit policy dimensions:</strong> school funding, tax tradeoffs and housing. These coordinates come from selected answers, not NLP inference.</p>
            <p><code>u = [2, −1, 1] · w = [{importance}, 1, 1]</code></p>
            {DEMO_CANDIDATES.map((candidate, i) => {
              const agreements = candidate.positions.map((position, j) => agreement(DEMO_ANSWERS[j], position));
              return <p key={candidate.label}><strong>{candidateLabel(i)}</strong> [{candidate.positions.join(", ")}]<br /><code>({importance} × {agreements[0].toFixed(2)} + 1 × {agreements[1].toFixed(2)} + 1 × {agreements[2].toFixed(2)}) / {importance + 2} = {(result.scores[i] * 100).toFixed(2)}%</code></p>;
            })}
            <p><strong>Stress test:</strong> 2,000 seeded local simulations. Stance noise: normal, σ = 0.6, clipped to [−2, 2]. Weight multiplier: exp(normal, σ = 0.35). Tiny random jitter breaks exact ties. Every dot represents one run. This uses the matching engine’s perturbation rules with a browser-specific random sequence.</p>
            <p><strong>Observed rank-first counts:</strong> A {result.counts[0]} · B {result.counts[1]} · C {result.counts[2]}.</p>
            <p>All three fictional profiles answer all three questions. The ballot flow compares only answered issues that the office handles, skips missing answers, and reports membership in the top two for vote-for-two races. This example shows a single-seat race.</p>
          </div>
        </details>
      </section>
      <footer className="be-footer"><span>Behind the ballot <span className="be-slash">/</span> Optional explanation</span><a href="/">Back to matching my ballot →</a></footer>
      <div className="be-sr" role="status">Step {step + 1}: {current.title} School funding importance {importance} of 3. {result.scores.map((score, i) => `${candidateLabel(i)}: ${(score * 100).toFixed(1)}%`).join(". ")}</div>
    </div>
  );
}
