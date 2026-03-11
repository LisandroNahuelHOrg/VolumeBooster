import type { SessionStatusPayload } from "../../../shared/types";
import type { WorkerRuntimeState } from "../runtime-state";
import { syncBadgePulseTimer } from "../badge/sync-badge-pulse-timer";
import { rebuildEffectiveSessions } from "../state/rebuild-effective-sessions";

export function applyManualStatusUpdate(runtime: WorkerRuntimeState, update: SessionStatusPayload): void {
  const currentSession = runtime.manualSessions.get(update.tabId);

  if (!currentSession) {
    return;
  }

  currentSession.streamState = update.streamState;
  currentSession.engineStatus = update.engineStatus;
  currentSession.gainPercent = update.gainPercent;
  currentSession.lastError = update.lastError;
  currentSession.updatedAt = runtime.now();

  if (update.streamState !== "active") {
    runtime.audibleTabs.delete(update.tabId);
    syncBadgePulseTimer(runtime);
  }

  rebuildEffectiveSessions(runtime);
}
