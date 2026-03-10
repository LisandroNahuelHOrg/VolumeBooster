import type { AutoBoosterConfigPayload } from "../../shared/types";
import type { AutoBoosterControllerInternals } from "./runtime-state";

export async function configureController(
  controller: AutoBoosterControllerInternals,
  payload: AutoBoosterConfigPayload
): Promise<void> {
  controller.ensureBridgeListeners();
  controller.state = {
    ...controller.state,
    tabId: payload.tabId,
    scope: payload.scope,
    enabled: payload.enabled,
    suspended: payload.suspended,
    gainPercent: payload.gainPercent,
    advancedAudioSettings: payload.advancedAudioSettings,
    attachState: payload.enabled ? "observing" : "idle",
    attachReason: payload.enabled ? "no_media" : undefined,
    lastError: undefined,
    activeStrategy: "none"
  };
  controller.lastTelemetryAt = null;
  controller.lastLevel = 0;
  controller.lastAudioContextState = "none";
  controller.lastAutoplayPolicy = undefined;
  controller.lastTechnicalError = undefined;
  controller.lastAutoRetryAt = 0;

  if (!payload.enabled) {
    controller.postBridgeCommand({
      type: "disable",
      payload: { tabId: payload.tabId }
    });
    controller.disarmGestureRetry();
    controller.clearAllPendingMediaRetryListeners();
    controller.setProcessingEnabled(false);
    controller.stopTelemetryLoop();
    controller.state.attachState = "idle";
    controller.state.attachReason = undefined;
    controller.state.activeStrategy = "none";
    controller.reportStatus();
    return;
  }

  controller.ensureObserver();

  if (payload.suspended) {
    controller.postBridgeCommand({
      type: "configure",
      payload
    });
    controller.disarmGestureRetry();
    controller.syncTrackedSessionsConfiguration();
    controller.setProcessingEnabled(false);
    controller.stopTelemetryLoop();
    controller.state.attachState = "observing";
    controller.state.attachReason = "no_media";
    controller.reportStatus();
    return;
  }

  controller.startTelemetryLoop();
  controller.syncTrackedSessionsConfiguration();
  controller.setProcessingEnabled(true);
  controller.postBridgeCommand({
    type: "configure",
    payload
  });
  controller.syncAttachState();
  controller.reportStatus();
  void controller.runRefreshMediaTracking();
}
