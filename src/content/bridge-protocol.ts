/**
 * @fileoverview Public facade for the MAIN-world bridge protocol contract.
 */

export {
  BRIDGE_COMMAND_EVENT,
  BRIDGE_SOURCE,
  BRIDGE_STATUS_EVENT,
  BRIDGE_TELEMETRY_EVENT
} from "./bridge-protocol/bridge-protocol-constants";
export type { BridgeActiveStrategy } from "./bridge-protocol/bridge-active-strategy";
export type { BridgeCommandPayload } from "./bridge-protocol/bridge-command-payload";
export type { BridgeCustomEventDetail } from "./bridge-protocol/bridge-custom-event-detail";
export type { BridgeRuntimeMetrics } from "./bridge-protocol/bridge-runtime-metrics";
export type { BridgeStatusPayload } from "./bridge-protocol/bridge-status-payload";
export type { BridgeTelemetryPayload } from "./bridge-protocol/bridge-telemetry-payload";
export { createBridgeCommandEvent } from "./bridge-protocol/create-bridge-command-event";
export { createBridgeDefaultMetrics } from "./bridge-protocol/create-bridge-default-metrics";
export { createBridgeStatusEvent } from "./bridge-protocol/create-bridge-status-event";
export { createBridgeTelemetryEvent } from "./bridge-protocol/create-bridge-telemetry-event";
export { isBridgeEventDetail } from "./bridge-protocol/is-bridge-event-detail";
