import { BRIDGE_SOURCE } from "./bridge-protocol-constants";
import type { BridgeCustomEventDetail } from "./bridge-custom-event-detail";

export function createBridgeCustomEvent<T>(
  eventName: string,
  payload: T
): CustomEvent<BridgeCustomEventDetail<T>> {
  return new CustomEvent(eventName, {
    detail: {
      source: BRIDGE_SOURCE,
      payload
    }
  });
}
