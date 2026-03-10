import type { AutoBoosterDebugState } from "../../shared/types";
import { discoverMediaElements } from "../media-discovery";
import type { AutoBoosterControllerInternals } from "./runtime-state";

export function getDebugState(
  controller: AutoBoosterControllerInternals,
  toastVisible = false
): AutoBoosterDebugState {
  const attachedElementCount =
    controller.trackedSessions.size + controller.bridgeStatus.attachedNodeCount;
  const attachedFrameCount = controller.state.attachState === "attached" ? 1 : 0;

  return {
    tabId: controller.state.tabId,
    lane: "auto_media_element",
    enabled: controller.state.enabled,
    suspended: controller.state.suspended,
    scope: controller.state.scope,
    attachState: controller.state.attachState,
    attachReason: controller.state.attachReason,
    ...(controller.state.activeStrategy !== "none"
      ? { activeStrategy: controller.state.activeStrategy }
      : {}),
    audioContextState: controller.lastAudioContextState,
    autoplayPolicy: controller.lastAutoplayPolicy,
    mediaElementCount: discoverMediaElements().length,
    attachedElementCount,
    frameCount: 1,
    readyFrameCount: 1,
    attachedFrameCount,
    toastVisible,
    ...(controller.bridgeStatus.audioContextCount > 0
      ? { bridgeContextCount: controller.bridgeStatus.audioContextCount }
      : {}),
    ...(controller.bridgeStatus.attachedNodeCount > 0
      ? { bridgeAttachedNodeCount: controller.bridgeStatus.attachedNodeCount }
      : {}),
    lastTelemetryAt:
      Math.max(
        controller.lastTelemetryAt ?? 0,
        controller.bridgeTelemetry.lastTelemetryAt || 0
      ) || null,
    lastLevel: Math.max(controller.lastLevel, controller.bridgeTelemetry.level),
    lastError: controller.state.lastError,
    lastTechnicalError: controller.lastTechnicalError,
    currentUrl: window.location.href
  };
}
