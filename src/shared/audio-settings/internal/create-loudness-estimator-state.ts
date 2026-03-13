import type { LoudnessEstimatorState } from "./loudness-estimator-state";
import { createKWeightingHighPassState } from "./create-k-weighting-high-pass-state";
import { createKWeightingHighShelfState } from "./create-k-weighting-high-shelf-state";

export function createLoudnessEstimatorState(sampleRate: number): LoudnessEstimatorState {
  return {
    historyBlocks: [],
    highPass: createKWeightingHighPassState(sampleRate),
    highShelf: createKWeightingHighShelfState(sampleRate),
    momentaryLoudnessDb: null,
    sampleBuffer: null,
    sampleRate,
    shortTermLoudnessDb: null,
    ungatedShortTermLoudnessDb: null
  };
}
