import type { AudioTelemetryPayload } from "../../audio-session";
import type { SessionMap } from "./session-manager-contract";
import { postRuntimeMessage } from "./post-runtime-message";

export const handleSessionTelemetry = (
  sessions: SessionMap,
  tabId: number,
  payload: AudioTelemetryPayload
): void => {
  const currentSession = sessions.get(tabId);

  if (!currentSession) {
    return;
  }

  currentSession.state.level = payload.level;
  currentSession.state.warning = payload.warning;
  currentSession.state.protectorActionDb = payload.metrics.protectorActionDb;
  currentSession.state.clipEvents = payload.metrics.clipEvents;
  currentSession.state.clipPeak = payload.metrics.clipPeak;
  currentSession.state.protectionBypassed = payload.metrics.protectionBypassed;
  currentSession.state.outputPeak = payload.metrics.outputPeak;
  currentSession.state.normalizationInputLoudnessDb =
    payload.metrics.normalizationInputLoudnessDb;
  currentSession.state.normalizationAppliedGainDb =
    payload.metrics.normalizationAppliedGainDb;
  currentSession.state.normalizationOffsetScore =
    payload.metrics.normalizationOffsetScore;
  currentSession.state.normalizationAction = payload.metrics.normalizationAction;
  currentSession.state.normalizationLoadPercent =
    payload.metrics.normalizationLoadPercent;
  postRuntimeMessage({
    type: "SESSION_LEVEL_UPDATE",
    payload: {
      tabId,
      level: payload.level,
      warning: payload.warning,
      protectorActionDb: payload.metrics.protectorActionDb,
      clipEvents: payload.metrics.clipEvents,
      clipPeak: payload.metrics.clipPeak,
      protectionBypassed: payload.metrics.protectionBypassed,
      outputPeak: payload.metrics.outputPeak,
      normalizationInputLoudnessDb: payload.metrics.normalizationInputLoudnessDb,
      normalizationAppliedGainDb: payload.metrics.normalizationAppliedGainDb,
      normalizationOffsetScore: payload.metrics.normalizationOffsetScore,
      normalizationAction: payload.metrics.normalizationAction,
      normalizationLoadPercent: payload.metrics.normalizationLoadPercent
    }
  });
};
