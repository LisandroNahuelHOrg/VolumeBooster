import { BRIDGE_SOURCE } from "./bridge-protocol-constants";

export interface BridgeCustomEventDetail<T> {
  source: typeof BRIDGE_SOURCE;
  payload: T;
}
