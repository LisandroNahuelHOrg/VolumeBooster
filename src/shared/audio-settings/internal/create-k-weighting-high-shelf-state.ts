import {
  LOUDNESS_HIGH_SHELF_FREQUENCY_HZ,
  LOUDNESS_HIGH_SHELF_GAIN_DB,
  LOUDNESS_HIGH_SHELF_SLOPE
} from "./loudness-constants";
import type { LoudnessBiquadState } from "./loudness-estimator-state";

export function createKWeightingHighShelfState(sampleRate: number): LoudnessBiquadState {
  const amplitude = Math.pow(10, LOUDNESS_HIGH_SHELF_GAIN_DB / 40);
  const omega = (2 * Math.PI * LOUDNESS_HIGH_SHELF_FREQUENCY_HZ) / sampleRate;
  const cosine = Math.cos(omega);
  const sine = Math.sin(omega);
  const alpha =
    (sine / 2) *
    Math.sqrt((amplitude + 1 / amplitude) * (1 / LOUDNESS_HIGH_SHELF_SLOPE - 1) + 2);
  const beta = 2 * Math.sqrt(amplitude) * alpha;
  const a0 = (amplitude + 1) - (amplitude - 1) * cosine + beta;

  return {
    b0: (amplitude * ((amplitude + 1) + (amplitude - 1) * cosine + beta)) / a0,
    b1: (-2 * amplitude * ((amplitude - 1) + (amplitude + 1) * cosine)) / a0,
    b2: (amplitude * ((amplitude + 1) + (amplitude - 1) * cosine - beta)) / a0,
    a1: (2 * ((amplitude - 1) - (amplitude + 1) * cosine)) / a0,
    a2: ((amplitude + 1) - (amplitude - 1) * cosine - beta) / a0,
    x1: 0,
    x2: 0,
    y1: 0,
    y2: 0
  };
}
