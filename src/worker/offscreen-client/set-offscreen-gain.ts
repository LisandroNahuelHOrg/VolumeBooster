import type { CaptureSessionState } from "../../shared/types";
import { resolveOffscreenSnapshotResponse } from "./resolve-offscreen-snapshot-response";
import type { SnapshotResponse } from "./snapshot-response";
import { sendOffscreenMessage } from "./send-offscreen-message";

export async function setOffscreenGain(tabId: number, gainPercent: number): Promise<CaptureSessionState[]> {
  const response = await sendOffscreenMessage<SnapshotResponse>({
    type: "OFFSCREEN_SET_GAIN",
    payload: { tabId, gainPercent }
  });

  return resolveOffscreenSnapshotResponse(response, "errorOffscreenSetGain");
}
