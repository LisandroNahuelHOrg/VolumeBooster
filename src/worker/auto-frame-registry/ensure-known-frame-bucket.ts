import type { KnownAutoFrame } from "./known-auto-frame";
import type { AutoFrameRegistryState } from "./auto-frame-registry-state";

export function ensureKnownFrameBucket(
  state: AutoFrameRegistryState,
  tabId: number
): Map<string, KnownAutoFrame> {
  let bucket = state.knownFramesByTab.get(tabId);

  if (!bucket) {
    bucket = new Map<string, KnownAutoFrame>();
    state.knownFramesByTab.set(tabId, bucket);
  }

  return bucket;
}
