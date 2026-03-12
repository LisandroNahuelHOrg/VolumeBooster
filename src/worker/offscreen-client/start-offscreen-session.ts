import type { CaptureSessionState, OffscreenSessionStartPayload } from "../../shared/types";
import { ensureOffscreenDocument } from "./ensure-offscreen-document";
import { resolveOffscreenSnapshotResponse } from "./resolve-offscreen-snapshot-response";
import type { SnapshotResponse } from "./snapshot-response";
import { sendOffscreenMessage } from "./send-offscreen-message";

export async function startOffscreenSession(
  payload: OffscreenSessionStartPayload
): Promise<CaptureSessionState[]> {
  await ensureOffscreenDocument();
  const response = await sendOffscreenMessage<SnapshotResponse>({
    type: "OFFSCREEN_START_SESSION",
    payload
  });

  return resolveOffscreenSnapshotResponse(response, "errorOffscreenStartSession");
}
