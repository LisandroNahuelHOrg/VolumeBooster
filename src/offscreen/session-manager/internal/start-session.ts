import { fail, message, ok } from "../../../shared/messages";
import type {
  CaptureSessionState,
  OffscreenSessionStartPayload,
  RuntimeResponse
} from "../../../shared/types";
import { createSessionCallbacks } from "./create-session-callbacks";
import { createSessionState } from "./create-session-state";
import { deriveReadySessionWarning } from "./derive-ready-session-warning";
import { discardSessionEntry } from "./discard-session-entry";
import { getSessionSnapshot } from "./get-session-snapshot";
import { publishSessionStatus } from "./publish-session-status";
import type { OffscreenSessionManagerRuntime } from "./session-manager-contract";
import { stopSessionEntry } from "./stop-session-entry";

export const startSession = async (
  runtime: OffscreenSessionManagerRuntime,
  payload: OffscreenSessionStartPayload
): Promise<RuntimeResponse<{ sessions: CaptureSessionState[] }>> => {
  try {
    await stopSessionEntry(runtime.sessions, payload.tabId);

    const state = createSessionState(payload, runtime.now);
    const audioSession = runtime.createAudioSession(
      payload.gainPercent,
      payload.advancedAudioSettings,
      createSessionCallbacks(runtime, payload.tabId)
    );

    runtime.sessions.set(payload.tabId, { audioSession, state });
    publishSessionStatus(state);
    await audioSession.start(payload.streamId);

    state.streamState = "active";
    state.engineStatus = "ready";
    state.warning = deriveReadySessionWarning(payload.advancedAudioSettings);
    publishSessionStatus(state);

    return ok({ sessions: getSessionSnapshot(runtime.sessions) });
  } catch {
    await discardSessionEntry(runtime.sessions, payload.tabId);
    return fail(message("errorAudioPipelineStart"));
  }
};
