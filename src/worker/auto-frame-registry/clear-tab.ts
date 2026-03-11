import type { AutoFrameRegistryState } from "./auto-frame-registry-state";

export function clearTab(state: AutoFrameRegistryState, tabId: number): void {
  state.knownFramesByTab.delete(tabId);
  state.frameStatesByTab.delete(tabId);
}
