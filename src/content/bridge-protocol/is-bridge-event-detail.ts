import { BRIDGE_SOURCE } from "./bridge-protocol-constants";
import type { BridgeCustomEventDetail } from "./bridge-custom-event-detail";

export function isBridgeEventDetail<T>(detail: unknown): detail is BridgeCustomEventDetail<T> {
  return Boolean(
    detail &&
      typeof detail === "object" &&
      "source" in detail &&
      (detail as { source?: unknown }).source === BRIDGE_SOURCE &&
      "payload" in detail
  );
}
