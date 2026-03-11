import type { AutoFrameRegistryState } from "./auto-frame-registry-state";
import type { KnownAutoFrame } from "./known-auto-frame";
import { getKnownFrames } from "./get-known-frames";

export function getTopFrame(state: AutoFrameRegistryState, tabId: number): KnownAutoFrame | null {
  const frames = getKnownFrames(state, tabId);

  for (const frame of frames) {
    if (frame.isTopFrame) {
      return frame;
    }
  }

  return null;
}
