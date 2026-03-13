import { createKWeightingHighPassState } from "./create-k-weighting-high-pass-state";
import { createKWeightingHighShelfState } from "./create-k-weighting-high-shelf-state";
import type { LoudnessEstimatorState } from "./loudness-estimator-state";

export function syncLoudnessEstimatorSampleRate(
  state: LoudnessEstimatorState,
  sampleRate: number
): void {
  if (state.sampleRate === sampleRate) {
    return;
  }

  state.sampleRate = sampleRate;
  state.highPass = createKWeightingHighPassState(sampleRate);
  state.highShelf = createKWeightingHighShelfState(sampleRate);
  state.historyBlocks = [];
  state.momentaryLoudnessDb = null;
  state.shortTermLoudnessDb = null;
  state.ungatedShortTermLoudnessDb = null;
}
