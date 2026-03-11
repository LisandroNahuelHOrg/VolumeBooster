import type { AutoFrameRuntimeState } from "../../shared/types";
import type { AutoFrameRegistryState } from "./auto-frame-registry-state";

export function getFrameStates(
  state: AutoFrameRegistryState,
  tabId: number
): AutoFrameRuntimeState[] {
  return Array.from(state.frameStatesByTab.get(tabId)?.values() ?? []);
}
