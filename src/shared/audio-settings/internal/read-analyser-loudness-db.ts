import {
  LOUDNESS_ABSOLUTE_GATE_DB,
  LOUDNESS_MOMENTARY_WINDOW_MS,
  LOUDNESS_SHORT_TERM_WINDOW_MS
} from "./loudness-constants";
import { calculateGatedShortTermLoudnessDb } from "./calculate-gated-short-term-loudness-db";
import { calculateWindowedLoudnessDb } from "./calculate-windowed-loudness-db";
import { deriveLoudnessHistoryBlock } from "./derive-loudness-history-block";
import type { LoudnessEstimatorState } from "./loudness-estimator-state";
import { syncLoudnessEstimatorSampleRate } from "./sync-loudness-estimator-sample-rate";

export function readAnalyserLoudnessDb(
  analyser: AnalyserNode,
  state: LoudnessEstimatorState
): number | null {
  syncLoudnessEstimatorSampleRate(state, analyser.context?.sampleRate ?? state.sampleRate);
  const bufferSize = analyser.fftSize;

  if (!state.sampleBuffer || state.sampleBuffer.length !== bufferSize) {
    state.sampleBuffer = new Float32Array(bufferSize);
  }

  analyser.getFloatTimeDomainData(state.sampleBuffer as Float32Array<ArrayBuffer>);
  state.historyBlocks.push(deriveLoudnessHistoryBlock(state.sampleBuffer, state));
  let coveredMs = state.historyBlocks.reduce((sum, block) => sum + block.durationMs, 0);

  while (
    state.historyBlocks.length > 0 &&
    coveredMs - state.historyBlocks[0].durationMs >= LOUDNESS_SHORT_TERM_WINDOW_MS
  ) {
    coveredMs -= state.historyBlocks[0].durationMs;
    state.historyBlocks.shift();
  }

  state.momentaryLoudnessDb = calculateWindowedLoudnessDb(
    state.historyBlocks,
    LOUDNESS_MOMENTARY_WINDOW_MS
  );
  state.ungatedShortTermLoudnessDb = calculateWindowedLoudnessDb(
    state.historyBlocks,
    LOUDNESS_SHORT_TERM_WINDOW_MS
  );
  state.shortTermLoudnessDb = calculateGatedShortTermLoudnessDb(
    state.historyBlocks,
    state.ungatedShortTermLoudnessDb
  );

  if (state.shortTermLoudnessDb !== null) {
    return state.shortTermLoudnessDb;
  }

  if (
    state.momentaryLoudnessDb !== null &&
    state.momentaryLoudnessDb >= LOUDNESS_ABSOLUTE_GATE_DB
  ) {
    return state.momentaryLoudnessDb;
  }

  return null;
}
