import type { LevelWarning } from "../../shared/types";
import type { BridgeActiveStrategy } from "./bridge-active-strategy";
import type { BridgeRuntimeMetrics } from "./bridge-runtime-metrics";

export interface BridgeTelemetryPayload {
  activeStrategy: BridgeActiveStrategy;
  level: number;
  warning: LevelWarning;
  metrics: BridgeRuntimeMetrics;
  audioContextCount: number;
  attachedNodeCount: number;
  lastTelemetryAt: number;
}
