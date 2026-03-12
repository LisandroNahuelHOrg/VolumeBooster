import type { AutoFrameRegistryState } from "./auto-frame-registry-state";
import type { KnownAutoFrame } from "./known-auto-frame";

export function getKnownFrames(state: AutoFrameRegistryState, tabId: number): KnownAutoFrame[] {
  return Array.from(state.knownFramesByTab.get(tabId)?.values() ?? []);
}
