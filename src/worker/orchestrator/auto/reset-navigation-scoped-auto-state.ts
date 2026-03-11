import type { WorkerRuntimeState } from "../runtime-state";
import { rebuildEffectiveSessions } from "../state/rebuild-effective-sessions";

export function resetNavigationScopedAutoState(runtime: WorkerRuntimeState, tabId: number): void {
  if (runtime.siteEnabledAutoTabs.has(tabId)) {
    runtime.siteEnabledAutoTabs.delete(tabId);
  }

  runtime.autoSuppressedTabs.delete(tabId);
  runtime.autoSessions.delete(tabId);
  runtime.autoTabStates.delete(tabId);
  runtime.autoDebugStates.delete(tabId);
  runtime.autoFrameRegistry.clearTab(tabId);
  runtime.audibleTabs.delete(tabId);
  rebuildEffectiveSessions(runtime);
}
