import type { WorkerState } from "../../../shared/types";

export function getTabIdentityKey(tab: WorkerState["currentTab"] | undefined): string {
  if (!tab) {
    return "none";
  }

  return `${tab.tabId}|${tab.supported ? "1" : "0"}`;
}
