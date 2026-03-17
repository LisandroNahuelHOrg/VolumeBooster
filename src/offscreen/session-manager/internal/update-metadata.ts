import { fail, message, ok } from "../../../shared/messages";
import type {
  CaptureSessionState,
  OffscreenMetadataPayload,
  RuntimeResponse
} from "../../../shared/types";
import { getSessionSnapshot } from "./get-session-snapshot";
import { publishSessionStatus } from "./publish-session-status";
import type { OffscreenSessionManagerRuntime } from "./session-manager-contract";
import { updateSessionMetadata } from "./update-session-metadata";

export const updateMetadata = async (
  runtime: OffscreenSessionManagerRuntime,
  payload: OffscreenMetadataPayload
): Promise<RuntimeResponse<{ sessions: CaptureSessionState[] }>> => {
  const entry = runtime.sessions.get(payload.tabId);

  if (!entry) {
    return fail(message("errorNoRunningSession"));
  }

  updateSessionMetadata(entry, payload, runtime.now);
  publishSessionStatus(entry.state);
  return ok({ sessions: getSessionSnapshot(runtime.sessions) });
};
