import { ok } from "../../../shared/messages";
import type {
  CaptureSessionState,
  RuntimeResponse
} from "../../../shared/types";
import { getSessionSnapshot } from "./get-session-snapshot";
import type { OffscreenSessionManagerRuntime } from "./session-manager-contract";
import { stopSessionEntry } from "./stop-session-entry";

export const stopSession = async (
  runtime: OffscreenSessionManagerRuntime,
  tabId: number
): Promise<RuntimeResponse<{ sessions: CaptureSessionState[] }>> => {
  await stopSessionEntry(runtime.sessions, tabId);
  return ok({ sessions: getSessionSnapshot(runtime.sessions) });
};
