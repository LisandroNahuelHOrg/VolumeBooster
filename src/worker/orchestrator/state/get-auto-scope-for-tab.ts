import type { AutoBoosterScope } from "../../../shared/types";
import type { WorkerRuntimeState } from "../runtime-state";

export function getAutoScopeForTab(runtime: WorkerRuntimeState, tabId: number): AutoBoosterScope | undefined {
  if (runtime.siteEnabledAutoTabs.has(tabId)) {
    return "site";
  }

  if (runtime.autoTabStates.get(tabId)?.autoBoosterScope === "global" || runtime.autoBoosterMode === "global") {
    return "global";
  }

  return undefined;
}
