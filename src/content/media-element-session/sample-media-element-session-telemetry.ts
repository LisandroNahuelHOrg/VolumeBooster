import {
  applyQualityProtector,
  buildDspRuntimeParameters,
  createDefaultMetrics,
  deriveMetricsFromPeaks,
  deriveWarningFromMetrics,
  isProtectionBypassedSettings
} from "../../shared/audio-settings";
import type { MediaElementTelemetry } from "./media-element-session-types";
import type { MediaElementSessionState } from "./media-element-session-state";
import { readMediaPeak } from "./read-media-peak";
import { roundMediaSessionValue } from "./round-media-session-value";

export function sampleMediaElementSessionTelemetry(state: MediaElementSessionState): MediaElementTelemetry {
  const runtime = applyQualityProtector(
    buildDspRuntimeParameters(state.currentGainPercent, state.currentSettings)
  );
  const inputPeak = readMediaPeak(state.inputAnalyserNode);
  const outputPeak = state.processingEnabled ? readMediaPeak(state.outputAnalyserNode) : inputPeak;
  const metrics = state.processingEnabled
    ? deriveMetricsFromPeaks(runtime, inputPeak, outputPeak, state.latestMetrics)
    : createDefaultMetrics(isProtectionBypassedSettings(state.currentSettings));
  const warning = state.processingEnabled ? deriveWarningFromMetrics(metrics) : "none";
  const level = roundMediaSessionValue(Math.min(1, Math.max(outputPeak, inputPeak * 0.45)), 4);

  state.latestMetrics = metrics;

  return {
    level,
    warning,
    metrics
  };
}
