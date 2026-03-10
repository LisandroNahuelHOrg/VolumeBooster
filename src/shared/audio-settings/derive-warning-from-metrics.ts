import type { DspRuntimeMetrics, LevelWarning } from "../types";
import { CLIP_THRESHOLD } from "./limits";

/** Converts runtime metrics into the coarse warning severity used by the UI. */
export function deriveWarningFromMetrics(metrics: DspRuntimeMetrics): LevelWarning {
  if (metrics.protectionBypassed) {
    if (metrics.clipEvents > 0 || metrics.clipPeak > 1.015 || metrics.outputPeak > CLIP_THRESHOLD) {
      return "danger";
    }

    if (metrics.outputPeak >= 0.96 || metrics.inputPeak >= 0.88) {
      return "high";
    }

    return "none";
  }

  if (metrics.clipEvents > 0 || metrics.clipPeak > CLIP_THRESHOLD || metrics.protectorActionDb >= 14) {
    return "danger";
  }

  if (metrics.protectorActionDb >= 5 || metrics.outputPeak >= 0.92) {
    return "high";
  }

  return "none";
}
