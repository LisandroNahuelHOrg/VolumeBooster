import {
  LOUDNESS_ABSOLUTE_GATE_DB,
  LOUDNESS_LUFS_OFFSET_DB,
  LOUDNESS_RELATIVE_GATE_OFFSET_DB
} from "./loudness-constants";
import type { LoudnessHistoryBlock } from "./loudness-estimator-state";
import { roundTo } from "./round-to";

export function calculateGatedShortTermLoudnessDb(
  blocks: LoudnessHistoryBlock[],
  ungatedShortTermLoudnessDb: number | null
): number | null {
  if (ungatedShortTermLoudnessDb === null) {
    return null;
  }

  const gateThresholdDb = Math.max(
    LOUDNESS_ABSOLUTE_GATE_DB,
    ungatedShortTermLoudnessDb - LOUDNESS_RELATIVE_GATE_OFFSET_DB
  );
  let weightedEnergy = 0;
  let totalDurationMs = 0;

  for (const block of blocks) {
    if (block.loudnessDb === null || block.loudnessDb < gateThresholdDb) {
      continue;
    }

    weightedEnergy += block.energy * block.durationMs;
    totalDurationMs += block.durationMs;
  }

  if (totalDurationMs <= 0 || weightedEnergy <= 0) {
    return null;
  }

  return roundTo(LOUDNESS_LUFS_OFFSET_DB + 10 * Math.log10(weightedEnergy / totalDurationMs), 2);
}
