import type { DspRuntimeMetrics } from "../types";
import { clamp01 } from "./internal/clamp-01";

/** Converts runtime metrics into the user-facing protection-load percentage. */
export function deriveProtectionLoadPercent(
  metrics: Pick<DspRuntimeMetrics, "protectionBypassed" | "protectorActionDb" | "inputPeak" | "outputPeak">
): number {
  if (metrics.protectionBypassed) {
    return 0;
  }

  if (Math.max(metrics.inputPeak, metrics.outputPeak) < 0.015) {
    return 0;
  }

  const actionWeight = clamp01(metrics.protectorActionDb / 18);
  const pressureWeight = clamp01(metrics.outputPeak / 0.98);

  return Math.round((actionWeight * 0.82 + pressureWeight * 0.18) * 100);
}
