import type { BridgeRuntimeMetrics } from "./bridge-runtime-metrics";

export function createBridgeDefaultMetrics(
  protectionBypassed = false
): BridgeRuntimeMetrics {
  return {
    protectorActionDb: 0,
    clipEvents: 0,
    clipPeak: 0,
    protectionBypassed,
    outputPeak: 0
  };
}
