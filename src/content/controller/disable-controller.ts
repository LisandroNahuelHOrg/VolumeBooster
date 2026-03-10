import type { AutoBoosterControllerInternals } from "./runtime-state";

export async function disableController(
  controller: AutoBoosterControllerInternals,
  tabId: number
): Promise<void> {
  if (controller.state.tabId !== tabId) {
    return;
  }

  controller.state.enabled = false;
  controller.state.scope = null;
  controller.state.suspended = false;
  controller.state.attachState = "idle";
  controller.state.attachReason = undefined;
  controller.state.lastError = undefined;
  controller.state.activeStrategy = "none";
  controller.postBridgeCommand({
    type: "disable",
    payload: { tabId }
  });
  controller.disarmGestureRetry();
  controller.clearAllPendingMediaRetryListeners();
  controller.setProcessingEnabled(false);
  controller.stopTelemetryLoop();
  controller.reportStatus();
}
