import {
  applyQualityProtector,
  buildDspRuntimeParameters,
  deriveNormalizationMetrics,
  deriveMetricsFromPeaks,
  deriveWarningFromMetrics
} from "../../../../shared/audio-settings";
import { readAnalyserLoudnessDb } from "../../../../shared/audio-settings/internal/read-analyser-loudness-db";
import { roundTo } from "../math/round-to";
import { emitAudioSessionTelemetry } from "./emit-audio-session-telemetry";
import { readPeak } from "./read-peak";
import { syncAudioSessionNormalizationGain } from "../graph/sync-audio-session-normalization-gain";
import type { AudioSessionState } from "../audio-session-state";

export function publishAudioSessionTelemetry(
  state: AudioSessionState,
  inputAnalyserNode: AnalyserNode,
  outputAnalyserNode: AnalyserNode
): void {
  const runtime = applyQualityProtector(
    buildDspRuntimeParameters(state.currentGainPercent, state.currentSettings)
  );
  const inputPeak = readPeak(inputAnalyserNode);
  const outputPeak = readPeak(outputAnalyserNode);
  const inputLoudnessDb = readAnalyserLoudnessDb(
    inputAnalyserNode,
    state.normalizationLoudnessState
  );
  const metrics = {
    ...deriveMetricsFromPeaks(runtime, inputPeak, outputPeak, state.latestMetrics),
    ...deriveNormalizationMetrics(runtime, inputLoudnessDb, state.latestMetrics)
  };
  const warning = deriveWarningFromMetrics(metrics);
  const level = roundTo(Math.min(1, Math.max(outputPeak, inputPeak * 0.45)), 4);

  state.latestMetrics = metrics;
  syncAudioSessionNormalizationGain(state, runtime);
  emitAudioSessionTelemetry(state, level, warning, metrics);
}
