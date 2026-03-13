import type { AutoFrameRuntimeState } from "../../shared/types";
import type { AggregatedAutoTelemetry } from "./aggregated-auto-telemetry";
import { pickHighestLevelWarning } from "./pick-highest-level-warning";
import { roundAutoTelemetryValue } from "./round-auto-telemetry-value";

export function calculateAggregatedAutoTelemetry(
  telemetryFrames: AutoFrameRuntimeState[]
): AggregatedAutoTelemetry {
  const dominantNormalizationFrame = telemetryFrames.reduce((best, frame) => {
    if (!best) {
      return frame;
    }

    return Math.abs(frame.normalizationOffsetScore ?? 0) >=
      Math.abs(best.normalizationOffsetScore ?? 0)
      ? frame
      : best;
  }, telemetryFrames[0]);

  return {
    level: roundAutoTelemetryValue(Math.max(...telemetryFrames.map((frame) => frame.level)), 4),
    warning: pickHighestLevelWarning(telemetryFrames.map((frame) => frame.warning)),
    protectorActionDb: roundAutoTelemetryValue(
      Math.max(...telemetryFrames.map((frame) => frame.protectorActionDb)),
      2
    ),
    clipEvents: telemetryFrames.reduce((sum, frame) => sum + frame.clipEvents, 0),
    clipPeak: roundAutoTelemetryValue(Math.max(...telemetryFrames.map((frame) => frame.clipPeak)), 4),
    protectionBypassed: telemetryFrames.some((frame) => frame.protectionBypassed),
    outputPeak: roundAutoTelemetryValue(Math.max(...telemetryFrames.map((frame) => frame.outputPeak)), 4),
    normalizationInputLoudnessDb: dominantNormalizationFrame?.normalizationInputLoudnessDb ?? null,
    normalizationAppliedGainDb: dominantNormalizationFrame?.normalizationAppliedGainDb ?? 0,
    normalizationOffsetScore: dominantNormalizationFrame?.normalizationOffsetScore ?? 0,
    normalizationAction: dominantNormalizationFrame?.normalizationAction ?? "holding",
    normalizationLoadPercent: dominantNormalizationFrame?.normalizationLoadPercent ?? 0
  };
}
