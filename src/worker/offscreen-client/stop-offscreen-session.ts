import type { CaptureSessionState } from "../../shared/types";
import { hasOffscreenDocument } from "./has-offscreen-document";
import { resolveOffscreenSnapshotResponse } from "./resolve-offscreen-snapshot-response";
import type { SnapshotResponse } from "./snapshot-response";
import { sendOffscreenMessage } from "./send-offscreen-message";

export async function stopOffscreenSession(tabId: number): Promise<CaptureSessionState[]> {
  if (!(await hasOffscreenDocument())) {
    return [];
  }

  const response = await sendOffscreenMessage<SnapshotResponse>({
    type: "OFFSCREEN_STOP_SESSION",
    payload: { tabId }
  });

  return resolveOffscreenSnapshotResponse(response, "errorOffscreenStopSession");
}
