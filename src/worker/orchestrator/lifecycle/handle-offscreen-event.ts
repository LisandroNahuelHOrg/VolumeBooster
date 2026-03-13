import { isOffscreenEvent } from "../../../shared/messages";
import type { WorkerRuntimeState } from "../runtime-state";
import { syncActionBadges } from "../badge/sync-action-badges";
import { updateAudibleState } from "../badge/update-audible-state";
import { broadcastState } from "../state/broadcast-state";
import { rebuildEffectiveSessions } from "../state/rebuild-effective-sessions";
import { applyManualStatusUpdate } from "../manual/apply-manual-status-update";
import { replaceManualSessions } from "../manual/replace-manual-sessions";

export async function handleOffscreenEvent(
  runtime: WorkerRuntimeState,
  incomingMessage: Extract<Parameters<typeof isOffscreenEvent>[0], unknown>
): Promise<void> {
  if (!isOffscreenEvent(incomingMessage)) {
    return;
  }

  switch (incomingMessage.type) {
    case "SESSION_LEVEL_UPDATE": {
      const currentSession = runtime.manualSessions.get(incomingMessage.payload.tabId);

      if (!currentSession) {
        return;
      }

      currentSession.level = incomingMessage.payload.level;
      currentSession.warning = incomingMessage.payload.warning;
      currentSession.protectorActionDb = incomingMessage.payload.protectorActionDb;
      currentSession.clipEvents = incomingMessage.payload.clipEvents;
      currentSession.clipPeak = incomingMessage.payload.clipPeak;
      currentSession.protectionBypassed = incomingMessage.payload.protectionBypassed;
      currentSession.outputPeak = incomingMessage.payload.outputPeak;
      currentSession.normalizationInputLoudnessDb = incomingMessage.payload.normalizationInputLoudnessDb;
      currentSession.normalizationAppliedGainDb = incomingMessage.payload.normalizationAppliedGainDb;
      currentSession.normalizationOffsetScore = incomingMessage.payload.normalizationOffsetScore;
      currentSession.normalizationAction = incomingMessage.payload.normalizationAction;
      currentSession.normalizationLoadPercent = incomingMessage.payload.normalizationLoadPercent;
      currentSession.updatedAt = runtime.now();
      rebuildEffectiveSessions(runtime);

      if (updateAudibleState(runtime, incomingMessage.payload.tabId, incomingMessage.payload.level)) {
        await syncActionBadges(runtime);
      }
      return;
    }
    case "SESSION_STATUS_UPDATE":
      applyManualStatusUpdate(runtime, incomingMessage.payload);
      await broadcastState(runtime);
      return;
    case "OFFSCREEN_SNAPSHOT":
      replaceManualSessions(runtime, incomingMessage.payload.sessions);
      await broadcastState(runtime);
      return;
  }
}
