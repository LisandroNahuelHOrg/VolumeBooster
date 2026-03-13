import { LOUDNESS_LUFS_OFFSET_DB } from "./loudness-constants";
import type { LoudnessHistoryBlock } from "./loudness-estimator-state";
import { roundTo } from "./round-to";

export function calculateWindowedLoudnessDb(
  blocks: LoudnessHistoryBlock[],
  windowMs: number
): number | null {
  let coveredMs = 0;
  let weightedEnergy = 0;
  let totalDurationMs = 0;

  for (let index = blocks.length - 1; index >= 0 && coveredMs < windowMs; index -= 1) {
    const block = blocks[index];
    coveredMs += block.durationMs;
    weightedEnergy += block.energy * block.durationMs;
    totalDurationMs += block.durationMs;
  }

  if (coveredMs < windowMs || totalDurationMs <= 0 || weightedEnergy <= 0) {
    return null;
  }

  return roundTo(LOUDNESS_LUFS_OFFSET_DB + 10 * Math.log10(weightedEnergy / totalDurationMs), 2);
}
