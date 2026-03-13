import {
  applyQualityProtector,
  buildDspRuntimeParameters,
  createDefaultMetrics,
  deriveNormalizationMetrics,
  deriveMetricsFromPeaks,
  deriveWarningFromMetrics,
  isProtectionBypassedSettings
} from "../../shared/audio-settings";
import { readAnalyserLoudnessDb } from "../../shared/audio-settings/internal/read-analyser-loudness-db";
import type { MediaElementTelemetry } from "./media-element-session-types";
import type { MediaElementSessionState } from "./media-element-session-state";
import { readMediaPeak } from "./read-media-peak";
import { roundMediaSessionValue } from "./round-media-session-value";
import { syncMediaElementSessionNormalizationGain } from "./sync-media-element-session-normalization-gain";

export function sampleMediaElementSessionTelemetry(state: MediaElementSessionState): MediaElementTelemetry {
  const runtime = applyQualityProtector(
    buildDspRuntimeParameters(state.currentGainPercent, state.currentSettings)
  );
  const inputPeak = readMediaPeak(state.inputAnalyserNode);
  const outputPeak = state.processingEnabled ? readMediaPeak(state.outputAnalyserNode) : inputPeak;
  const inputLoudnessDb = readAnalyserLoudnessDb(
    state.inputAnalyserNode,
    state.normalizationLoudnessState
  );
  const metrics = state.processingEnabled
    ? {
        ...deriveMetricsFromPeaks(runtime, inputPeak, outputPeak, state.latestMetrics),
        ...deriveNormalizationMetrics(runtime, inputLoudnessDb, state.latestMetrics)
      }
    : createDefaultMetrics(isProtectionBypassedSettings(state.currentSettings));
  const warning = state.processingEnabled ? deriveWarningFromMetrics(metrics) : "none";
  const level = roundMediaSessionValue(Math.min(1, Math.max(outputPeak, inputPeak * 0.45)), 4);

  state.latestMetrics = metrics;
  syncMediaElementSessionNormalizationGain(state, runtime);

  return {
    level,
    warning,
    metrics
  };
}
