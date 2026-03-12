import type { AutoFrameRuntimeState } from "../../shared/types";
import type { AggregatedAutoTelemetry } from "./aggregated-auto-telemetry";
import { pickHighestLevelWarning } from "./pick-highest-level-warning";
import { roundAutoTelemetryValue } from "./round-auto-telemetry-value";

export function calculateAggregatedAutoTelemetry(
  telemetryFrames: AutoFrameRuntimeState[]
): AggregatedAutoTelemetry {
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
    outputPeak: roundAutoTelemetryValue(Math.max(...telemetryFrames.map((frame) => frame.outputPeak)), 4)
  };
}
