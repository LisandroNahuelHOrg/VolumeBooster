export interface BridgeRuntimeMetrics {
  protectorActionDb: number;
  clipEvents: number;
  clipPeak: number;
  protectionBypassed: boolean;
  outputPeak: number;
  normalizationInputLoudnessDb?: number | null;
  normalizationAppliedGainDb?: number;
  normalizationOffsetScore?: number;
  normalizationAction?: "raising" | "lowering" | "holding" | "capped";
  normalizationLoadPercent?: number;
}
