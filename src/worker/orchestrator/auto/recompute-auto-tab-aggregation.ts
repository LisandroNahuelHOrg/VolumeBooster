import { aggregateAutoFrameStates } from "../../auto-tab-aggregate";
import type { WorkerRuntimeState } from "../runtime-state";
import { syncBadgePulseTimer } from "../badge/sync-badge-pulse-timer";
import { rebuildEffectiveSessions } from "../state/rebuild-effective-sessions";

export function recomputeAutoTabAggregation(runtime: WorkerRuntimeState, tabId: number): void {
  const aggregated = aggregateAutoFrameStates(tabId, runtime.autoFrameRegistry.getFrameStates(tabId), runtime.now);

  if (!aggregated) {
    runtime.autoSessions.delete(tabId);
    runtime.autoTabStates.delete(tabId);
    runtime.autoDebugStates.delete(tabId);
    runtime.audibleTabs.delete(tabId);
    rebuildEffectiveSessions(runtime);
    return;
  }

  runtime.autoTabStates.set(tabId, aggregated.tabState);
  runtime.autoDebugStates.set(tabId, aggregated.debug);

  if (aggregated.session) {
    runtime.autoSessions.set(tabId, aggregated.session);
  } else {
    runtime.autoSessions.delete(tabId);
    runtime.audibleTabs.delete(tabId);
    syncBadgePulseTimer(runtime);
  }

  rebuildEffectiveSessions(runtime);
}
