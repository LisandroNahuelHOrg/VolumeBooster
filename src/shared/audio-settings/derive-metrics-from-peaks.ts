import type { DspRuntimeMetrics } from "../types";
import type { DspRuntimeParameters } from "./contracts";
import { createDefaultMetrics } from "./create-default-metrics";
import { CLIP_THRESHOLD } from "./limits";
import { isProtectionBypassedRuntime } from "./internal/is-protection-bypassed-runtime";
import { peakToDb } from "./internal/peak-to-db";
import { roundTo } from "./internal/round-to";

/** Derives runtime metrics from observed input and output peaks. */
export function deriveMetricsFromPeaks(
  runtime: DspRuntimeParameters,
  inputPeak: number,
  outputPeak: number,
  previousMetrics: DspRuntimeMetrics = createDefaultMetrics()
): DspRuntimeMetrics {
  const normalizedInputPeak = roundTo(Math.max(0, inputPeak), 4);
  const normalizedOutputPeak = roundTo(Math.max(0, outputPeak), 4);
  const protectionBypassed = isProtectionBypassedRuntime(runtime);
  const inputDbWithDrive = peakToDb(normalizedInputPeak) + runtime.inputDriveDb;
  const outputDb = peakToDb(normalizedOutputPeak);
  const protectorActionDb = protectionBypassed ? 0 : roundTo(Math.max(0, inputDbWithDrive - outputDb), 2);
  const clipDetected = normalizedOutputPeak > CLIP_THRESHOLD;

  return {
    protectorActionDb,
    clipEvents: clipDetected ? Math.min(previousMetrics.clipEvents + 1, 9999) : previousMetrics.clipEvents,
    clipPeak: clipDetected
      ? roundTo(Math.max(previousMetrics.clipPeak, normalizedOutputPeak), 4)
      : previousMetrics.clipPeak,
    protectionBypassed,
    inputPeak: normalizedInputPeak,
    outputPeak: normalizedOutputPeak
  };
}
