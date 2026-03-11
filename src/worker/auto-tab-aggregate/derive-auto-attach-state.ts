import type { AutoAttachState, AutoFrameRuntimeState } from "../../shared/types";

export function deriveAutoAttachState(
  frameStates: AutoFrameRuntimeState[],
  hasAttachedFrames: boolean
): AutoAttachState {
  if (hasAttachedFrames) {
    return "attached";
  }

  if (frameStates.some((frame) => frame.autoAttachState === "awaiting_user_gesture")) {
    return "awaiting_user_gesture";
  }

  if (frameStates.some((frame) => frame.autoAttachState === "observing")) {
    return "observing";
  }

  if (frameStates.every((frame) => frame.autoAttachState === "unsupported")) {
    return "unsupported";
  }

  if (frameStates.some((frame) => frame.autoAttachState === "failed")) {
    return "failed";
  }

  return "observing";
}
