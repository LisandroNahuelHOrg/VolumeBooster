import type { AutoBoosterControllerInternals } from "./runtime-state";

export async function handleGestureRetry(
  controller: AutoBoosterControllerInternals
): Promise<void> {
  controller.disarmGestureRetry();

  if (!controller.state.enabled || controller.state.suspended) {
    return;
  }

  if (controller.state.attachState !== "awaiting_user_gesture") {
    return;
  }

  controller.state.attachState = "observing";
  controller.state.attachReason = "no_media";
  controller.state.lastError = undefined;
  controller.lastTechnicalError = undefined;
  await controller.runRefreshMediaTracking();
  controller.syncAttachState();
  controller.reportStatus();
}
