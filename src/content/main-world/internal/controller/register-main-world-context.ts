import { createMainWorldBridgeState } from "../graph/create-main-world-bridge-state";
import type { MainWorldController } from "../main-world-runtime-state";

export function registerMainWorldContext(controller: MainWorldController, context: AudioContext): void {
  if (controller.bridgeStates.has(context)) {
    return;
  }

  const state = createMainWorldBridgeState(context, controller.nextContextId++);
  controller.contextIds.set(context, state.id);
  controller.bridgeStates.set(context, state);
  controller.bridgeStateList.push(state);
  controller.applyRuntimeParameters(state);
  void context.resume().catch(() => undefined);
  controller.syncTelemetryLoop();
  controller.reportStatus();
}
