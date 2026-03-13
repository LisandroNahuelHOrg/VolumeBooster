import { expect, test } from "vitest";
import { createLoudnessEstimatorState } from "./create-loudness-estimator-state";
import { readAnalyserLoudnessDb } from "./read-analyser-loudness-db";

test("does not let a brief transient swing short-term loudness like an rms spike would", () => {
  let sampleIndex = 0;
  let amplitude = 0.18;
  const analyser = {
    fftSize: 1024,
    context: { sampleRate: 48_000 },
    getFloatTimeDomainData(buffer: Float32Array) {
      for (let index = 0; index < buffer.length; index += 1) {
        buffer[index] = Math.sin((sampleIndex / 48_000) * Math.PI * 2 * 440) * amplitude;
        sampleIndex += 1;
      }
    }
  } as unknown as AnalyserNode;
  const state = createLoudnessEstimatorState(48_000);

  for (let index = 0; index < 142; index += 1) {
    readAnalyserLoudnessDb(analyser, state);
  }

  const baseline = state.shortTermLoudnessDb;
  amplitude = 0.9;
  readAnalyserLoudnessDb(analyser, state);
  amplitude = 0.18;

  for (let index = 0; index < 5; index += 1) {
    readAnalyserLoudnessDb(analyser, state);
  }

  expect(baseline).not.toBeNull();
  expect(state.shortTermLoudnessDb).not.toBeNull();
  expect(Math.abs((state.shortTermLoudnessDb ?? 0) - (baseline ?? 0))).toBeLessThan(2);
});
