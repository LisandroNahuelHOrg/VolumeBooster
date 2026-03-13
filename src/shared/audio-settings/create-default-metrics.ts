import type { DspRuntimeMetrics } from "../types";

/** Creates a zeroed metrics object for a new or reset session. */
export function createDefaultMetrics(protectionBypassed = false): DspRuntimeMetrics {
  return {
    protectorActionDb: 0,
    clipEvents: 0,
    clipPeak: 0,
    protectionBypassed,
    inputPeak: 0,
    outputPeak: 0,
    normalizationInputLoudnessDb: null,
    normalizationAppliedGainDb: 0,
    normalizationOffsetScore: 0,
    normalizationAction: "holding",
    normalizationLoadPercent: 0
  };
}
