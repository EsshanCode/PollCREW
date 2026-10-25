// A complete, fictional three-issue example. Production matching remains in backend/matching.py.
export const DEMO_ANSWERS = [2, -1, 1] as const;
export const DEMO_CANDIDATES = [
  { label: "Candidate A", name: "Aster", positions: [2, 0, -1] },
  { label: "Candidate B", name: "Juniper", positions: [1, -1, 2] },
  { label: "Candidate C", name: "Cedar", positions: [-1, 1, 1] },
] as const;
export const SCENARIOS = 2000;
export type Importance = 1 | 2 | 3;
export type WalkthroughResult = ReturnType<typeof calculateWalkthrough>;

export function agreement(voter: number, candidate: number) {
  return 1 - Math.abs(voter - candidate) / 4;
}

function seededRandom(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function calculateWalkthrough(importance: Importance) {
  const weights = [importance, 1, 1];
  const total = importance + 2;
  const scores = DEMO_CANDIDATES.map((candidate) =>
    candidate.positions.reduce<number>(
      (sum, position, i) => sum + weights[i] * agreement(DEMO_ANSWERS[i], position),
      0,
    ) / total,
  );
  const counts = [0, 0, 0];
  const winners: number[] = [];
  const draws: number[][] = [];
  const orders: number[][] = [];
  const random = seededRandom(426123 + importance);
  const normal = () => Math.sqrt(-2 * Math.log(Math.max(1e-12, random()))) * Math.cos(2 * Math.PI * random());

  // Same perturbation rules as the backend, with a browser-specific seeded sequence.
  for (let n = 0; n < SCENARIOS; n++) {
    const answers = DEMO_ANSWERS.map((x) => Math.max(-2, Math.min(2, x + 0.6 * normal())));
    const perturbedWeights = weights.map((x) => x * Math.exp(0.35 * normal()));
    const denominator = perturbedWeights.reduce((a, b) => a + b, 0);
    let best = -1;
    let winner = 0;
    const sample: number[] = [];
    const rankingScores: number[] = [];
    DEMO_CANDIDATES.forEach((candidate, i) => {
      const score = candidate.positions.reduce<number>(
        (sum, position, j) => sum + perturbedWeights[j] * agreement(answers[j], position),
        0,
      ) / denominator;
      sample.push(score);
      const rankingScore = score + random() * 1e-9;
      rankingScores.push(rankingScore);
      if (rankingScore > best) {
        best = rankingScore;
        winner = i;
      }
    });
    counts[winner]++;
    winners.push(winner);
    draws.push(sample);
    orders.push([0, 1, 2].sort((a, b) => rankingScores[b] - rankingScores[a]));
  }
  return { scores, counts, winners, draws, orders };
}
