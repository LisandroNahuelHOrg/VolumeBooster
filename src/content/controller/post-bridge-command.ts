import { createBridgeCommandEvent } from "../bridge-protocol";
import type { BridgeCommandPayload } from "../bridge-protocol";
import type { AutoBoosterControllerInternals } from "./runtime-state";

export function postBridgeCommand(
  controller: AutoBoosterControllerInternals,
  payload: BridgeCommandPayload
): void {
  if (!controller.canDispatchBridgeEvents()) {
    return;
  }

  window.dispatchEvent(createBridgeCommandEvent(payload));
}
