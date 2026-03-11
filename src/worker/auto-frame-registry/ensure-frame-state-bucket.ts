import type { AutoFrameRuntimeState } from "../../shared/types";
import type { AutoFrameRegistryState } from "./auto-frame-registry-state";

export function ensureFrameStateBucket(
  state: AutoFrameRegistryState,
  tabId: number
): Map<string, AutoFrameRuntimeState> {
  let bucket = state.frameStatesByTab.get(tabId);

  if (!bucket) {
    bucket = new Map<string, AutoFrameRuntimeState>();
    state.frameStatesByTab.set(tabId, bucket);
  }

  return bucket;
}
