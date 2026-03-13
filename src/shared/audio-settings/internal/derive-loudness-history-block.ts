import { LOUDNESS_LUFS_OFFSET_DB } from "./loudness-constants";
import type { LoudnessEstimatorState, LoudnessHistoryBlock } from "./loudness-estimator-state";
import { roundTo } from "./round-to";
import { stepLoudnessBiquad } from "./step-loudness-biquad";

export function deriveLoudnessHistoryBlock(
  samples: Float32Array<ArrayBufferLike>,
  state: LoudnessEstimatorState
): LoudnessHistoryBlock {
  let weightedEnergy = 0;

  for (const sample of samples) {
    const highShelfSample = stepLoudnessBiquad(state.highShelf, sample);
    const filteredSample = stepLoudnessBiquad(state.highPass, highShelfSample);
    weightedEnergy += filteredSample * filteredSample;
  }

  const blockEnergy = weightedEnergy / samples.length;
  const blockLoudnessDb =
    Number.isFinite(blockEnergy) && blockEnergy > 0.000000000001
      ? roundTo(LOUDNESS_LUFS_OFFSET_DB + 10 * Math.log10(blockEnergy), 2)
      : null;

  return {
    durationMs: roundTo((samples.length / state.sampleRate) * 1000, 2),
    energy: blockEnergy,
    loudnessDb: blockLoudnessDb
  };
}
