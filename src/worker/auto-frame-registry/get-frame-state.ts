import type { AutoFrameRuntimeState, AutoFrameTarget } from "../../shared/types";
import type { AutoFrameRegistryState } from "./auto-frame-registry-state";
import { makeAutoFrameKey } from "./make-auto-frame-key";

export function getFrameState(
  state: AutoFrameRegistryState,
  tabId: number,
  target: AutoFrameTarget
): AutoFrameRuntimeState | null {
  return state.frameStatesByTab.get(tabId)?.get(makeAutoFrameKey(target)) ?? null;
}
