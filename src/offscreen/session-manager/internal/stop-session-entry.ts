import type { SessionMap } from "./session-manager-contract";
import { postRuntimeMessage } from "./post-runtime-message";

export const stopSessionEntry = async (
  sessions: SessionMap,
  tabId: number
): Promise<void> => {
  const entry = sessions.get(tabId);

  if (!entry) {
    return;
  }

  entry.state.streamState = "inactive";
  entry.state.engineStatus = "ready";
  await entry.audioSession.stop();
  sessions.delete(tabId);
  postRuntimeMessage({
    type: "SESSION_STATUS_UPDATE",
    payload: {
      tabId,
      streamState: "inactive",
      engineStatus: "ready",
      gainPercent: entry.state.gainPercent
    }
  });
};
