import type { AutoFrameTarget } from "../../shared/types";
import type { AutoFrameRegistryState } from "./auto-frame-registry-state";
import { makeAutoFrameKey } from "./make-auto-frame-key";

export function markToastDismissed(
  state: AutoFrameRegistryState,
  tabId: number,
  target: AutoFrameTarget,
  dismissed: boolean
): void {
  const knownFrame = state.knownFramesByTab.get(tabId)?.get(makeAutoFrameKey(target));

  if (knownFrame) {
    knownFrame.toastDismissed = dismissed;
  }
}
