import { fail, message, ok } from "../../../shared/messages";
import type {
  CaptureSessionState,
  RuntimeResponse
} from "../../../shared/types";
import { applySessionGain } from "./apply-session-gain";
import { getSessionSnapshot } from "./get-session-snapshot";
import { publishSessionStatus } from "./publish-session-status";
import type { OffscreenSessionManagerRuntime } from "./session-manager-contract";

export const setGain = async (
  runtime: OffscreenSessionManagerRuntime,
  tabId: number,
  gainPercent: number
): Promise<RuntimeResponse<{ sessions: CaptureSessionState[] }>> => {
  const entry = runtime.sessions.get(tabId);

  if (!entry) {
    return fail(message("errorNoRunningSession"));
  }

  applySessionGain(entry, gainPercent);
  publishSessionStatus(entry.state);
  return ok({ sessions: getSessionSnapshot(runtime.sessions) });
};
