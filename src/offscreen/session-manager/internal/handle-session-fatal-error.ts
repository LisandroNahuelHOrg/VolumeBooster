import type { LocalizedMessage } from "../../../shared/types";
import type { SessionMap } from "./session-manager-contract";
import { publishSessionStatus } from "./publish-session-status";

export const handleSessionFatalError = async (
  sessions: SessionMap,
  tabId: number,
  errorMessage: LocalizedMessage,
  now: () => number
): Promise<void> => {
  const entry = sessions.get(tabId);

  if (!entry || entry.state.engineStatus === "error") {
    return;
  }

  entry.state.streamState = "error";
  entry.state.engineStatus = "error";
  entry.state.level = 0;
  entry.state.warning = "danger";
  entry.state.protectorActionDb = 0;
  entry.state.clipEvents = 0;
  entry.state.clipPeak = 0;
  entry.state.outputPeak = 0;
  entry.state.lastError = errorMessage;
  entry.state.updatedAt = now();
  publishSessionStatus(entry.state);
  await entry.audioSession.stop().catch(() => undefined);
};
