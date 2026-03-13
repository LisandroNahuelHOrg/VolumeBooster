import { expect, test } from "vitest";
import { createKWeightingHighPassState } from "./create-k-weighting-high-pass-state";

test("builds stable k-weighting high-pass coefficients for 44.1k and 48k sample rates", () => {
  const state44100 = createKWeightingHighPassState(44_100);
  const state48000 = createKWeightingHighPassState(48_000);

  expect(Object.values(state44100).every(Number.isFinite)).toBe(true);
  expect(Object.values(state48000).every(Number.isFinite)).toBe(true);
  expect(state44100.b0).not.toBe(state48000.b0);
  expect(state44100.a1).not.toBe(state48000.a1);
});
