import { createLoudnessEstimatorState } from "./create-loudness-estimator-state";
import type { LoudnessEstimatorState } from "./loudness-estimator-state";

export function resetLoudnessEstimatorState(state: LoudnessEstimatorState): LoudnessEstimatorState {
  return createLoudnessEstimatorState(state.sampleRate);
}
