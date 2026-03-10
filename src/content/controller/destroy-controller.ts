import {
  BRIDGE_STATUS_EVENT,
  BRIDGE_TELEMETRY_EVENT
} from "../bridge-protocol";
import type { AutoBoosterControllerInternals } from "./runtime-state";

export async function destroyController(
  controller: AutoBoosterControllerInternals
): Promise<void> {
  controller.stopTelemetryLoop();
  controller.disarmGestureRetry();
  controller.clearAllPendingMediaRetryListeners();
  controller.observer?.disconnect();
  controller.observer = null;
  window.clearInterval(controller.historyCheckTimer);

  if (controller.bridgeListenersBound) {
    if (controller.canRemoveBridgeListeners()) {
      window.removeEventListener(
        BRIDGE_STATUS_EVENT,
        controller.handleBridgeStatusEvent as EventListener
      );
      window.removeEventListener(
        BRIDGE_TELEMETRY_EVENT,
        controller.handleBridgeTelemetryEvent as EventListener
      );
    }

    controller.bridgeListenersBound = false;
  }

  for (const trackedSession of controller.trackedSessions.values()) {
    await trackedSession.session.stop().catch(() => undefined);
  }

  controller.trackedSessions.clear();
}
