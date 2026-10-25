import { test, expect } from "@playwright/test";
import { AGREEMENT_MATRIX, monteCarloDiagnostics, scoreAtSchoolWeight, sensitivity } from "../lib/ballot-diagnostics";
import { calculateWalkthrough } from "../lib/ballot-walkthrough";

test("matrix scores, distance, derivative and ablation agree with the example", () => {
  expect(AGREEMENT_MATRIX).toEqual([[1, .75, .5], [.75, 1, .75], [.25, .5, 1]]);
  const values = sensitivity(0, 2);
  expect(values.score).toBe(.8125);
  expect(values.weightedDistance).toBe(.75);
  expect(values.normalizedWeights).toEqual([.5, .25, .25]);
  expect(values.contributions).toEqual([.5, .1875, .125]);
  expect(values.gradient).toEqual([.046875, -.015625, -.078125]);
  expect(values.ablations[0]).toBe(.625);
  expect(values.ablations[1]).toBeCloseTo(5 / 6, 12);
  expect(values.ablations[2]).toBeCloseTo(11 / 12, 12);
  const delta = .00001;
  const numericSlope = (scoreAtSchoolWeight(0, 2 + delta) - scoreAtSchoolWeight(0, 2 - delta)) / (2 * delta);
  expect(values.gradient[0]).toBeCloseTo(numericSlope, 8);
  expect(scoreAtSchoolWeight(0, 2)).toBe(scoreAtSchoolWeight(1, 2));
  expect(scoreAtSchoolWeight(0, 1)).toBeLessThan(scoreAtSchoolWeight(1, 1));
  expect(scoreAtSchoolWeight(0, 3)).toBeGreaterThan(scoreAtSchoolWeight(1, 3));
});

test("Monte Carlo diagnostics account for every draw without changing the seeded results", () => {
  for (const importance of [1, 2, 3] as const) {
    const result = calculateWalkthrough(importance);
    expect(result.counts).toEqual({ 1: [541, 1448, 11], 2: [844, 1155, 1], 3: [1138, 862, 0] }[importance]);
    for (const samples of [50, 200, 2000]) {
      const d = monteCarloDiagnostics(result, samples);
      expect(d.counts.reduce((a, b) => a + b, 0)).toBe(samples);
      d.rankCounts.forEach((row) => expect(row.reduce((a, b) => a + b, 0)).toBe(samples));
      for (let i = 0; i < 3; i++) {
        expect(d.rankCounts.reduce((sum, row) => sum + row[i], 0)).toBe(samples);
        expect(d.rankCounts[i][0]).toBe(d.counts[i]);
        for (let j = i + 1; j < 3; j++) expect(d.pairwiseCounts[i][j] + d.pairwiseCounts[j][i]).toBe(samples);
        const distribution = d.distributions[i];
        expect(distribution.bins.reduce((a, b) => a + b, 0)).toBe(samples);
        expect(distribution.low).toBeGreaterThanOrEqual(0);
        expect(distribution.low).toBeLessThanOrEqual(distribution.median);
        expect(distribution.median).toBeLessThanOrEqual(distribution.high);
        expect(distribution.high).toBeLessThanOrEqual(1);
      }
      expect(d.traces.at(-1)?.shares).toEqual(d.shares);
      expect(d.entropy).toBeGreaterThanOrEqual(0);
      expect(d.entropy).toBeLessThanOrEqual(Math.log2(3));
      expect(d.effectiveContenders).toBeGreaterThanOrEqual(1);
      expect(d.effectiveContenders).toBeLessThanOrEqual(3);
    }
  }
});

test("zero-share categories produce finite entropy and sampling error", () => {
  const result = calculateWalkthrough(3);
  const d = monteCarloDiagnostics(result, 2000);
  expect(d.shares[2]).toBe(0);
  expect(d.standardErrors[2]).toBe(0);
  expect(Number.isFinite(d.entropy)).toBe(true);
  const one = monteCarloDiagnostics(result, 1);
  expect(one.entropy).toBeCloseTo(0);
  expect(one.effectiveContenders).toBe(1);
});
