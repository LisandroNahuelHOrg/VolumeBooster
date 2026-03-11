import type { DspRuntimeMetrics, LevelWarning } from "../../shared/types";

export interface MediaElementTelemetry {
  level: number;
  warning: LevelWarning;
  metrics: DspRuntimeMetrics;
}

export interface MediaElementSessionDebugState {
  audioContextState: AudioContextState | "none";
  autoplayPolicy?: string;
}
