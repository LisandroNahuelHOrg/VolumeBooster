import type { AdvancedAudioSettings, CaptureSessionState } from "../../shared/types";
import { hasOffscreenDocument } from "./has-offscreen-document";
import { resolveOffscreenSnapshotResponse } from "./resolve-offscreen-snapshot-response";
import type { SnapshotResponse } from "./snapshot-response";
import { sendOffscreenMessage } from "./send-offscreen-message";

export async function setOffscreenAdvancedAudioSettings(
  settings: AdvancedAudioSettings
): Promise<CaptureSessionState[]> {
  if (!(await hasOffscreenDocument())) {
    return [];
  }

  const response = await sendOffscreenMessage<SnapshotResponse>({
    type: "OFFSCREEN_SET_ADVANCED_AUDIO_SETTINGS",
    payload: settings
  });

  return resolveOffscreenSnapshotResponse(response, "errorOffscreenSetAudioSettings");
}
