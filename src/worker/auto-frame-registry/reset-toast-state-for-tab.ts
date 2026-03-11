import type { AutoFrameRegistryState } from "./auto-frame-registry-state";
import { getFrameStates } from "./get-frame-states";
import { getKnownFrames } from "./get-known-frames";

export function resetToastStateForTab(state: AutoFrameRegistryState, tabId: number): void {
  const knownFrames = getKnownFrames(state, tabId);

  for (const frame of knownFrames) {
    frame.toastVisible = false;
    frame.toastDismissed = false;
  }

  const frameStates = getFrameStates(state, tabId);

  for (const frameState of frameStates) {
    frameState.toastVisible = false;
  }
}
