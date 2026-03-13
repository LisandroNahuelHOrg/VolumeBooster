import {
  LOUDNESS_HIGH_PASS_FREQUENCY_HZ,
  LOUDNESS_HIGH_PASS_Q
} from "./loudness-constants";
import type { LoudnessBiquadState } from "./loudness-estimator-state";

export function createKWeightingHighPassState(sampleRate: number): LoudnessBiquadState {
  const omega = (2 * Math.PI * LOUDNESS_HIGH_PASS_FREQUENCY_HZ) / sampleRate;
  const cosine = Math.cos(omega);
  const sine = Math.sin(omega);
  const alpha = sine / (2 * LOUDNESS_HIGH_PASS_Q);
  const a0 = 1 + alpha;

  return {
    b0: ((1 + cosine) / 2) / a0,
    b1: (-(1 + cosine)) / a0,
    b2: ((1 + cosine) / 2) / a0,
    a1: (-2 * cosine) / a0,
    a2: (1 - alpha) / a0,
    x1: 0,
    x2: 0,
    y1: 0,
    y2: 0
  };
}
