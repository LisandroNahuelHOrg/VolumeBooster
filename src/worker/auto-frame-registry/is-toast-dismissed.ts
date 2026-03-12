import type { AutoFrameTarget } from "../../shared/types";
import type { AutoFrameRegistryState } from "./auto-frame-registry-state";
import { makeAutoFrameKey } from "./make-auto-frame-key";

export function isToastDismissed(
  state: AutoFrameRegistryState,
  tabId: number,
  target: AutoFrameTarget
): boolean {
  return state.knownFramesByTab.get(tabId)?.get(makeAutoFrameKey(target))?.toastDismissed ?? false;
}
