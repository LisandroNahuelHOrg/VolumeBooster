import type { CaptureSessionState, OffscreenMetadataPayload } from "../../shared/types";
import { resolveOffscreenSnapshotResponse } from "./resolve-offscreen-snapshot-response";
import type { SnapshotResponse } from "./snapshot-response";
import { sendOffscreenMessage } from "./send-offscreen-message";

export async function updateOffscreenMetadata(
  payload: OffscreenMetadataPayload
): Promise<CaptureSessionState[]> {
  const response = await sendOffscreenMessage<SnapshotResponse>({
    type: "OFFSCREEN_UPDATE_METADATA",
    payload
  });

  return resolveOffscreenSnapshotResponse(response, "errorOffscreenUpdateMetadata");
}
