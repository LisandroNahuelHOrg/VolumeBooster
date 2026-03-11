import type {
  AutoFrameTarget,
  AutoSessionStatusPayload
} from "../../../shared/types";

export function resolveFrameTarget(
  sender: chrome.runtime.MessageSender | undefined,
  payload: Partial<Pick<AutoSessionStatusPayload, "frameId" | "documentId">>
): AutoFrameTarget {
  return {
    frameId: sender?.frameId ?? payload.frameId ?? 0,
    documentId: sender?.documentId ?? payload.documentId
  };
}
