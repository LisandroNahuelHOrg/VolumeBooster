import { ok } from "../../../shared/messages";
import type {
  AdvancedAudioSettings,
  CaptureSessionState,
  RuntimeResponse
} from "../../../shared/types";
import { applySessionAdvancedAudioSettings } from "./apply-session-advanced-audio-settings";
import { getSessionSnapshot } from "./get-session-snapshot";
import type { OffscreenSessionManagerRuntime } from "./session-manager-contract";

export const setAdvancedAudioSettings = async (
  runtime: OffscreenSessionManagerRuntime,
  settings: AdvancedAudioSettings
): Promise<RuntimeResponse<{ sessions: CaptureSessionState[] }>> => {
  for (const entry of runtime.sessions.values()) {
    applySessionAdvancedAudioSettings(entry, settings);
  }

  return ok({ sessions: getSessionSnapshot(runtime.sessions) });
};
