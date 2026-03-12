import { BRIDGE_COMMAND_EVENT } from "./bridge-protocol-constants";
import type { BridgeCommandPayload } from "./bridge-command-payload";
import type { BridgeCustomEventDetail } from "./bridge-custom-event-detail";
import { createBridgeCustomEvent } from "./create-bridge-custom-event";

export function createBridgeCommandEvent(
  payload: BridgeCommandPayload
): CustomEvent<BridgeCustomEventDetail<BridgeCommandPayload>> {
  return createBridgeCustomEvent(BRIDGE_COMMAND_EVENT, payload);
}
