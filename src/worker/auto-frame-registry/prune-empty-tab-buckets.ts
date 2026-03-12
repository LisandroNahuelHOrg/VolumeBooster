import type { AutoFrameRegistryState } from "./auto-frame-registry-state";

export function pruneEmptyTabBuckets(state: AutoFrameRegistryState, tabId: number): void {
  if ((state.knownFramesByTab.get(tabId)?.size ?? 0) === 0) {
    state.knownFramesByTab.delete(tabId);
  }

  if ((state.frameStatesByTab.get(tabId)?.size ?? 0) === 0) {
    state.frameStatesByTab.delete(tabId);
  }
}
