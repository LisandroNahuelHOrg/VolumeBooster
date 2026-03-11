import type { CaptureSessionState } from "../../shared/types";
import { hasOffscreenDocument } from "./has-offscreen-document";
import type { SnapshotResponse } from "./snapshot-response";
import { sendOffscreenMessage } from "./send-offscreen-message";

export async function getOffscreenSnapshot(): Promise<CaptureSessionState[]> {
  if (!(await hasOffscreenDocument())) {
    return [];
  }

  const response = await sendOffscreenMessage<SnapshotResponse>({ type: "OFFSCREEN_GET_SNAPSHOT" });
  return response.ok && response.data ? response.data.sessions : [];
}
