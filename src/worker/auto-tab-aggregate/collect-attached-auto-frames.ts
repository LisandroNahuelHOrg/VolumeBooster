import type { AutoFrameRuntimeState } from "../../shared/types";

export function collectAttachedAutoFrames(frameStates: AutoFrameRuntimeState[]): AutoFrameRuntimeState[] {
  return frameStates.filter(
    (frame) => frame.autoAttachState === "attached" && frame.streamState === "active"
  );
}
