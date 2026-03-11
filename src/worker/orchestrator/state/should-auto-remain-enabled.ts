import type { WorkerRuntimeState } from "../runtime-state";

export function shouldAutoRemainEnabled(runtime: WorkerRuntimeState, tabId: number): boolean {
  return (
    runtime.siteEnabledAutoTabs.has(tabId) ||
    (runtime.autoBoosterMode === "global" && !runtime.autoSuppressedTabs.has(tabId))
  );
}
