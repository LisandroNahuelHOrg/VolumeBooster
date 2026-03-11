import { BRIDGE_TELEMETRY_EVENT } from "./bridge-protocol-constants";
import type { BridgeCustomEventDetail } from "./bridge-custom-event-detail";
import type { BridgeTelemetryPayload } from "./bridge-telemetry-payload";
import { createBridgeCustomEvent } from "./create-bridge-custom-event";

export function createBridgeTelemetryEvent(
  payload: BridgeTelemetryPayload
): CustomEvent<BridgeCustomEventDetail<BridgeTelemetryPayload>> {
  return createBridgeCustomEvent(BRIDGE_TELEMETRY_EVENT, payload);
}
