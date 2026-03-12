import type { AutoFrameTarget } from "../../shared/types";
import type { AutoFrameRegistryState } from "./auto-frame-registry-state";
import { makeAutoFrameKey } from "./make-auto-frame-key";

export function markToastVisible(
  state: AutoFrameRegistryState,
  tabId: number,
  target: AutoFrameTarget,
  visible: boolean
): void {
  const key = makeAutoFrameKey(target);
  const knownFrame = state.knownFramesByTab.get(tabId)?.get(key);

  if (knownFrame) {
    knownFrame.toastVisible = visible;
  }

  const frameState = state.frameStatesByTab.get(tabId)?.get(key);

  if (frameState) {
    frameState.toastVisible = visible;
  }
}
