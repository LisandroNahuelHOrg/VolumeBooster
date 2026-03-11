import type { AutoAttachReason, AutoAttachState, AutoFrameRuntimeState } from "../../shared/types";

export function deriveAutoAttachReason(
  frameStates: AutoFrameRuntimeState[],
  attachState: AutoAttachState
): AutoAttachReason | undefined {
  if (attachState === "attached") {
    return undefined;
  }

  if (attachState === "awaiting_user_gesture") {
    return "autoplay_blocked";
  }

  if (attachState === "observing") {
    return "no_media";
  }

  if (attachState === "unsupported") {
    return (
      frameStates.find((frame) => frame.autoAttachReason === "site_not_hookable")?.autoAttachReason ??
      frameStates.find((frame) => frame.autoAttachReason)?.autoAttachReason
    );
  }

  return (
    frameStates.find((frame) => frame.autoAttachReason === "attach_failed")?.autoAttachReason ??
    frameStates.find((frame) => frame.autoAttachReason === "permission_missing")?.autoAttachReason ??
    frameStates.find((frame) => frame.autoAttachReason)?.autoAttachReason
  );
}
