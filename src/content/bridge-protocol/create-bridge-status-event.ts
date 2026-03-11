import { BRIDGE_STATUS_EVENT } from "./bridge-protocol-constants";
import type { BridgeCustomEventDetail } from "./bridge-custom-event-detail";
import type { BridgeStatusPayload } from "./bridge-status-payload";
import { createBridgeCustomEvent } from "./create-bridge-custom-event";

export function createBridgeStatusEvent(
  payload: BridgeStatusPayload
): CustomEvent<BridgeCustomEventDetail<BridgeStatusPayload>> {
  return createBridgeCustomEvent(BRIDGE_STATUS_EVENT, payload);
}
