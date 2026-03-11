import type { AutoFrameTarget } from "../../shared/types";
import type { AutoFrameRegistryState } from "./auto-frame-registry-state";
import { makeAutoFrameKey } from "./make-auto-frame-key";
import { pruneEmptyTabBuckets } from "./prune-empty-tab-buckets";

export function removeFrame(
  state: AutoFrameRegistryState,
  tabId: number,
  target: AutoFrameTarget
): void {
  const key = makeAutoFrameKey(target);

  state.knownFramesByTab.get(tabId)?.delete(key);
  state.frameStatesByTab.get(tabId)?.delete(key);
  pruneEmptyTabBuckets(state, tabId);
}
