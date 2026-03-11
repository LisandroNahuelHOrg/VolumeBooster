import { BRIDGE_COMMAND_EVENT } from "../../../bridge-protocol";
import type { MainWorldController } from "../main-world-runtime-state";

export function bootstrapMainWorldController(controller: MainWorldController): void {
  controller.patchConstructors();
  controller.patchAudioNodePrototype();
  window.addEventListener(BRIDGE_COMMAND_EVENT, controller.handleBridgeCommand as EventListener);
  controller.syncTelemetryLoop();
  controller.reportStatus();
}
