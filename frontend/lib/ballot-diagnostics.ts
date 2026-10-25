import { agreement, DEMO_ANSWERS, DEMO_CANDIDATES, type Importance, type WalkthroughResult } from "./ballot-walkthrough";

export const AGREEMENT_MATRIX = DEMO_CANDIDATES.map((candidate) =>
  candidate.positions.map((position, i) => agreement(DEMO_ANSWERS[i], position)),
);

export function scoreAtSchoolWeight(candidate: number, schoolWeight: number) {
  const a = AGREEMENT_MATRIX[candidate];
  return (schoolWeight * a[0] + a[1] + a[2]) / (schoolWeight + 2);
}

export function sensitivity(candidate: number, importance: Importance) {
  const weights = [importance, 1, 1];
  const total = importance + 2;
  const score = scoreAtSchoolWeight(candidate, importance);
  const agreements = AGREEMENT_MATRIX[candidate];
  return {
    score,
    normalizedWeights: weights.map((weight) => weight / total),
    contributions: agreements.map((a, i) => weights[i] * a / total),
    weightedDistance: 4 * (1 - score),
    gradient: agreements.map((a) => (a - score) / total),
    ablations: agreements.map((a, i) => (total * score - weights[i] * a) / (total - weights[i])),
  };
}

function quantile(sorted: number[], fraction: number) {
  const index = (sorted.length - 1) * fraction;
  const lower = Math.floor(index);
  return sorted[lower] + (sorted[Math.min(lower + 1, sorted.length - 1)] - sorted[lower]) * (index - lower);
}

// These are descriptive diagnostics of the same fictional draws, not new ranking inputs.
export function monteCarloDiagnostics(result: WalkthroughResult, requestedSamples: number) {
  const samples = Math.max(1, Math.min(result.draws.length, Math.floor(requestedSamples)));
  const counts = [0, 0, 0];
  const rankCounts = Array.from({ length: 3 }, () => [0, 0, 0]);
  const pairwiseCounts = Array.from({ length: 3 }, () => [0, 0, 0]);
  const traces: { n: number; shares: number[] }[] = [];
  for (let n = 0; n < samples; n++) {
    counts[result.winners[n]]++;
    const order = result.orders[n];
    order.forEach((candidate, rank) => {
      rankCounts[candidate][rank]++;
      order.slice(rank + 1).forEach((other) => pairwiseCounts[candidate][other]++);
    });
    if (n === 0 || (n + 1) % 20 === 0 || n === samples - 1) {
      traces.push({ n: n + 1, shares: counts.map((count) => count / (n + 1)) });
    }
  }
  const shares = counts.map((count) => count / samples);
  const entropy = -shares.reduce((sum, p) => sum + (p > 0 ? p * Math.log2(p) : 0), 0);
  const distributions = DEMO_CANDIDATES.map((_, candidate) => {
    const values = result.draws.slice(0, samples).map((draw) => draw[candidate]).sort((a, b) => a - b);
    const bins = Array<number>(20).fill(0);
    values.forEach((value) => bins[Math.min(19, Math.floor(value * 20))]++);
    return {
      bins,
      mean: values.reduce((sum, value) => sum + value, 0) / samples,
      low: quantile(values, 0.05),
      median: quantile(values, 0.5),
      high: quantile(values, 0.95),
    };
  });
  return {
    samples, counts, shares, rankCounts, pairwiseCounts, traces, entropy, distributions,
    effectiveContenders: 2 ** entropy,
    standardErrors: shares.map((p) => Math.sqrt(p * (1 - p) / samples)),
  };
}
