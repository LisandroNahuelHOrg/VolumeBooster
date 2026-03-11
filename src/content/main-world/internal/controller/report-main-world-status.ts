import { createBridgeStatusEvent } from "../../../bridge-protocol";
import type { MainWorldController } from "../main-world-runtime-state";

export function reportMainWorldStatus(controller: MainWorldController): void {
  window.dispatchEvent(createBridgeStatusEvent(controller.buildStatusPayload()));
}
