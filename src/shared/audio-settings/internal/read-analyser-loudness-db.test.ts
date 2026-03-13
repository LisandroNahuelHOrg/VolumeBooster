import { expect, test } from "vitest";
import { createLoudnessEstimatorState } from "./create-loudness-estimator-state";
import { readAnalyserLoudnessDb } from "./read-analyser-loudness-db";

test("waits for momentary and short-term windows before publishing loudness and falls back to null on silence", () => {
  let sampleIndex = 0;
  let amplitude = 0.25;
  const analyser = {
    fftSize: 1024,
    context: { sampleRate: 48_000 },
    getFloatTimeDomainData(buffer: Float32Array) {
      for (let index = 0; index < buffer.length; index += 1) {
        buffer[index] = Math.sin((sampleIndex / 48_000) * Math.PI * 2 * 220) * amplitude;
        sampleIndex += 1;
      }
    }
  } as unknown as AnalyserNode;
  const state = createLoudnessEstimatorState(48_000);

  for (let index = 0; index < 18; index += 1) {
    expect(readAnalyserLoudnessDb(analyser, state)).toBeNull();
  }

  const momentaryOnly = readAnalyserLoudnessDb(analyser, state);
  expect(momentaryOnly).not.toBeNull();
  expect(state.shortTermLoudnessDb).toBeNull();

  for (let index = 0; index < 122; index += 1) {
    readAnalyserLoudnessDb(analyser, state);
  }

  expect(state.shortTermLoudnessDb).not.toBeNull();
  expect(state.shortTermLoudnessDb).toBeLessThan(-10);

  amplitude = 0;

  for (let index = 0; index < 141; index += 1) {
    readAnalyserLoudnessDb(analyser, state);
  }

  expect(readAnalyserLoudnessDb(analyser, state)).toBeNull();
  expect(state.momentaryLoudnessDb).toBeNull();
  expect(state.shortTermLoudnessDb).toBeNull();
});
