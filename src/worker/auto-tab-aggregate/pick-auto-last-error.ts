import type { AutoAttachState, AutoFrameRuntimeState, LocalizedMessage } from "../../shared/types";

export function pickAutoLastError(
  frameStates: AutoFrameRuntimeState[],
  attachState: AutoAttachState
): LocalizedMessage | undefined {
  if (attachState === "attached") {
    return undefined;
  }

  if (attachState === "awaiting_user_gesture") {
    return (
      frameStates.find((frame) => frame.autoAttachState === "awaiting_user_gesture" && frame.lastError)?.lastError ??
      frameStates.find((frame) => frame.lastError)?.lastError
    );
  }

  if (attachState === "unsupported") {
    return (
      frameStates.find((frame) => frame.autoAttachState === "unsupported" && frame.lastError)?.lastError ??
      frameStates.find((frame) => frame.lastError)?.lastError
    );
  }

  if (attachState === "observing") {
    return (
      frameStates.find((frame) => frame.autoAttachState === "observing" && frame.lastError)?.lastError ??
      frameStates.find((frame) => frame.lastError)?.lastError
    );
  }

  return (
    frameStates.find((frame) => frame.autoAttachState === "failed" && frame.lastError)?.lastError ??
    frameStates.find((frame) => frame.lastError)?.lastError
  );
}
