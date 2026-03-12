import type { AutoFrameRuntimeState } from "../../shared/types";

export function pickPreferredAutoFrame(frameStates: AutoFrameRuntimeState[]): AutoFrameRuntimeState {
  return (
    frameStates.find((frame) => frame.isTopFrame) ??
    frameStates.find((frame) => frame.autoAttachState === "attached") ??
    frameStates[0]
  );
}
