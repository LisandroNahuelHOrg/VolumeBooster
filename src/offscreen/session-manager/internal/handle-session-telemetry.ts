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
      outputPeak: payload.metrics.outputPeak
    }
  });
};
