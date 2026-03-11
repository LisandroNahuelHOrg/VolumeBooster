import type { AutoAttachReason, AutoAttachState } from "../../../../shared/types";
import { type BridgeStatusPayload } from "../../../bridge-protocol";
import type { MainWorldController } from "../main-world-runtime-state";
import { getMainWorldAutoplayPolicy } from "./get-main-world-autoplay-policy";

export function buildMainWorldStatusPayload(controller: MainWorldController): BridgeStatusPayload {
  const attachedNodeCount = controller.bridgeStateList.reduce(
    (sum, bridgeState) => sum + bridgeState.attachedNodes.size,
    0
  );
  const activeContexts = controller.bridgeStateList.filter((bridgeState) => bridgeState.attachedNodes.size > 0);
  const audioContextState = activeContexts[0]?.context.state ?? controller.bridgeStateList[0]?.context.state ?? "none";
  const autoplayPolicy = activeContexts[0]
    ? getMainWorldAutoplayPolicy(activeContexts[0].context)
    : controller.bridgeStateList[0]
      ? getMainWorldAutoplayPolicy(controller.bridgeStateList[0].context)
      : undefined;
  let attachState: AutoAttachState = "idle";
  let attachReason: AutoAttachReason | undefined;

  if (controller.state.enabled) {
    if (attachedNodeCount > 0) {
      attachState = audioContextState === "suspended" ? "awaiting_user_gesture" : "attached";
      attachReason = attachState === "awaiting_user_gesture" ? "autoplay_blocked" : undefined;
    } else if (controller.bridgeStateList.length > 0 && audioContextState === "suspended") {
      attachState = "awaiting_user_gesture";
      attachReason = "autoplay_blocked";
    } else {
      attachState = "observing";
      attachReason = "no_media";
    }
  }

  return {
    enabled: controller.state.enabled,
    suspended: controller.state.suspended,
    scope: controller.state.scope,
    attachState,
    attachReason,
    activeStrategy: attachedNodeCount > 0 ? "web_audio_bridge" : "none",
    audioContextState,
    autoplayPolicy,
    audioContextCount: controller.bridgeStateList.length,
    attachedNodeCount,
    lastTechnicalError: controller.lastTechnicalError,
    currentUrl: window.location.href
  };
}
