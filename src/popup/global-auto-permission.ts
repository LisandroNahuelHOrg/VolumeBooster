import type { WorkerState } from "../shared/types";

/**
 * Returns the current tab id that can immediately continue into global mode
 * once all-sites access has been restored.
 */
export function getRecoverableGlobalAutoTabId(state: WorkerState | null | undefined): number | null {
  if (!state?.hasGlobalPermission || state.currentTab?.supported !== true) {
    return null;
  }

  const tabId = state.currentTab?.tabId;

  return typeof tabId === "number" && tabId > -1 ? tabId : null;
}
