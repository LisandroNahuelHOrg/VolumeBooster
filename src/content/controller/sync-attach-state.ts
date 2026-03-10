import type { AutoBoosterControllerInternals } from "./runtime-state";

export function syncAttachState(controller: AutoBoosterControllerInternals): void {
  if (!controller.state.enabled) {
    controller.state.attachState = "idle";
    controller.state.attachReason = undefined;
    controller.state.activeStrategy = "none";
    return;
  }

  const hasMediaStrategy = controller.trackedSessions.size > 0;
  const hasBridgeStrategy =
    controller.bridgeStatus.attachState === "attached" &&
    controller.bridgeStatus.activeStrategy === "web_audio_bridge";

  if (hasMediaStrategy || hasBridgeStrategy) {
    controller.state.attachState = "attached";
    controller.state.attachReason = undefined;
    controller.state.activeStrategy =
      hasMediaStrategy && hasBridgeStrategy
        ? "hybrid"
        : hasBridgeStrategy
          ? "web_audio_bridge"
          : "media_element";
    return;
  }

  if (
    controller.state.attachState === "awaiting_user_gesture" ||
    controller.bridgeStatus.attachState === "awaiting_user_gesture"
  ) {
    controller.state.attachState = "awaiting_user_gesture";
    controller.state.attachReason = "autoplay_blocked";
    controller.state.activeStrategy = "none";
    return;
  }

  if (
    controller.state.attachState === "failed" ||
    controller.bridgeStatus.attachState === "failed"
  ) {
    controller.state.attachState = "failed";
    controller.state.attachReason =
      controller.state.attachReason ??
      controller.bridgeStatus.attachReason ??
      "attach_failed";
    controller.state.activeStrategy = "none";
    return;
  }

  controller.state.attachState = "observing";
  controller.state.attachReason = "no_media";
  controller.state.activeStrategy = "none";
}
