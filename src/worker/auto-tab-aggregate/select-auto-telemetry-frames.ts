import type { AutoFrameRuntimeState } from "../../shared/types";

export function selectAutoTelemetryFrames(
  frameStates: AutoFrameRuntimeState[],
  attachedFrames: AutoFrameRuntimeState[]
): AutoFrameRuntimeState[] {
  return attachedFrames.length > 0 ? attachedFrames : frameStates;
}
