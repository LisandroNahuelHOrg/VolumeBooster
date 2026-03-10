import {
  BRIDGE_STATUS_EVENT,
  BRIDGE_TELEMETRY_EVENT
} from "../bridge-protocol";
import type { AutoBoosterControllerInternals } from "./runtime-state";

export function ensureBridgeListeners(
  controller: AutoBoosterControllerInternals
): void {
  if (controller.bridgeListenersBound || !controller.canBindBridgeListeners()) {
    return;
  }

  window.addEventListener(
    BRIDGE_STATUS_EVENT,
    controller.handleBridgeStatusEvent as EventListener
  );
  window.addEventListener(
    BRIDGE_TELEMETRY_EVENT,
    controller.handleBridgeTelemetryEvent as EventListener
  );
  controller.bridgeListenersBound = true;
}
