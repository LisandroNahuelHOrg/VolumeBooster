import type { AutoFrameRuntimeState } from "../../shared/types";
import type { AutoDebugStateSnapshot } from "./auto-tab-aggregation-contract";

export function buildAutoDebugStateSnapshot(
  frameStates: AutoFrameRuntimeState[],
  attachedFrames: AutoFrameRuntimeState[]
): AutoDebugStateSnapshot {
  return {
    frameCount: frameStates.length,
    readyFrameCount: frameStates.filter((frame) => frame.ready).length,
    attachedFrameCount: attachedFrames.length,
    toastVisible: frameStates.some((frame) => frame.toastVisible)
  };
}
