import { isBridgeEventDetail, type BridgeCommandPayload } from "../../../bridge-protocol";
import type { MainWorldController } from "../main-world-runtime-state";

export function createHandleBridgeCommand(controller: MainWorldController): (event: Event) => void {
  return (event: Event): void => {
    const customEvent = event as CustomEvent<unknown>;

    if (!isBridgeEventDetail<BridgeCommandPayload>(customEvent.detail)) {
      return;
    }

    const payload = customEvent.detail.payload;

    if (payload.type === "configure") {
      controller.configure(payload.payload);
      return;
    }

    controller.disable();
  };
}
