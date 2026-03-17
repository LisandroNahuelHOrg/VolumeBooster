import { ok } from "../../../shared/messages";
import type {
  CaptureSessionState,
  RuntimeResponse
} from "../../../shared/types";
import { getSessionSnapshot } from "./get-session-snapshot";
import type { OffscreenSessionManagerRuntime } from "./session-manager-contract";
import { stopSessionEntry } from "./stop-session-entry";

export const stopAll = async (
  runtime: OffscreenSessionManagerRuntime
): Promise<RuntimeResponse<{ sessions: CaptureSessionState[] }>> => {
  for (const tabId of [...runtime.sessions.keys()]) {
    await stopSessionEntry(runtime.sessions, tabId);
  }

  return ok({ sessions: getSessionSnapshot(runtime.sessions) });
};
