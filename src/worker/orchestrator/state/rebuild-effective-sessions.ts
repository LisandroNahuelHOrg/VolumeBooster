import type { WorkerRuntimeState } from "../runtime-state";
import { pruneAudibleTabs } from "../badge/prune-audible-tabs";
import { syncBadgePulseTimer } from "../badge/sync-badge-pulse-timer";

export function rebuildEffectiveSessions(runtime: WorkerRuntimeState): void {
  runtime.sessions.clear();

  for (const session of runtime.autoSessions.values()) {
    runtime.sessions.set(session.tabId, { ...session });
  }

  for (const session of runtime.manualSessions.values()) {
    runtime.sessions.set(session.tabId, { ...session });
  }

  pruneAudibleTabs(runtime);
  syncBadgePulseTimer(runtime);
}
