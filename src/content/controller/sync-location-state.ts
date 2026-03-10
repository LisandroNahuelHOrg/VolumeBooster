import type { AutoBoosterControllerInternals } from "./runtime-state";

export function syncLocationState(controller: AutoBoosterControllerInternals): void {
  if (window.location.href === controller.lastLocationHref) {
    if (
      controller.state.enabled &&
      !controller.state.suspended &&
      controller.state.advancedAudioSettings &&
      controller.trackedSessions.size === 0
    ) {
      const shouldRetryObserving =
        controller.state.attachState === "observing" &&
        controller.state.attachReason === "no_media";

      if (shouldRetryObserving) {
        const now = Date.now();
        const retryIntervalMs = 500;

        if (now - controller.lastAutoRetryAt >= retryIntervalMs) {
          controller.lastAutoRetryAt = now;
          void controller.runRefreshMediaTracking();
        }
      }
    }

    return;
  }

  controller.lastLocationHref = window.location.href;
  controller.lastAutoRetryAt = 0;
  controller.pruneDetachedSessions();
  controller.lastTechnicalError = undefined;
  controller.syncAttachState();
  controller.reportStatus();
  void controller.runRefreshMediaTracking();
}
