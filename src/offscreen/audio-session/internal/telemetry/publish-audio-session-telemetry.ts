import {
  applyQualityProtector,
  buildDspRuntimeParameters,
  deriveMetricsFromPeaks,
  deriveWarningFromMetrics
} from "../../../../shared/audio-settings";
import { roundTo } from "../math/round-to";
import { emitAudioSessionTelemetry } from "./emit-audio-session-telemetry";
import { readPeak } from "./read-peak";
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
  const metrics = deriveMetricsFromPeaks(runtime, inputPeak, outputPeak, state.latestMetrics);
  const warning = deriveWarningFromMetrics(metrics);
  const level = roundTo(Math.min(1, Math.max(outputPeak, inputPeak * 0.45)), 4);

  state.latestMetrics = metrics;
  emitAudioSessionTelemetry(state, level, warning, metrics);
}
