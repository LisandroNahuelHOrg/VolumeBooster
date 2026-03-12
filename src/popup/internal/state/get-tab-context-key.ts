import type { WorkerState } from "../../../shared/types";

export function getTabContextKey(tab: WorkerState["currentTab"] | undefined): string {
  if (!tab) {
    return "none";
  }

  return `${tab.tabId}|${tab.url ?? ""}|${tab.domain ?? ""}|${tab.supported ? "1" : "0"}`;
}
