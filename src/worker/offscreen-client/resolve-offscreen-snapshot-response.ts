import { message } from "../../shared/messages";
import type { RuntimeResponse } from "../../shared/types";
import type { SnapshotResponse } from "./snapshot-response";

type MessageKey = Parameters<typeof message>[0];

export function resolveOffscreenSnapshotResponse(
  response: RuntimeResponse<SnapshotResponse>,
  fallbackMessageKey: MessageKey
): SnapshotResponse["sessions"] {
  if (!response.ok || !response.data) {
    throw response.errorMessage ?? message(fallbackMessageKey);
  }

  return response.data.sessions;
}
