import { expect, test } from "vitest";
import { createKWeightingHighShelfState } from "./create-k-weighting-high-shelf-state";

test("builds stable k-weighting high-shelf coefficients for 44.1k and 48k sample rates", () => {
  const state44100 = createKWeightingHighShelfState(44_100);
  const state48000 = createKWeightingHighShelfState(48_000);

  expect(Object.values(state44100).every(Number.isFinite)).toBe(true);
  expect(Object.values(state48000).every(Number.isFinite)).toBe(true);
  expect(state44100.b0).not.toBe(state48000.b0);
  expect(state44100.a2).not.toBe(state48000.a2);
});
