import type { LevelWarning } from "../../shared/types";

export interface AggregatedAutoTelemetry {
  level: number;
  warning: LevelWarning;
  protectorActionDb: number;
  clipEvents: number;
  clipPeak: number;
  protectionBypassed: boolean;
  outputPeak: number;
}
