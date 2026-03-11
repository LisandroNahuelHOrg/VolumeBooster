import type { AutoSessionAttachFailedPayload } from "../../../../shared/types";
import { makeAutoStatus } from "./make-auto-status";

export function makeAttachFailure(
  overrides: Partial<AutoSessionAttachFailedPayload> = {}
): AutoSessionAttachFailedPayload {
  return {
    ...makeAutoStatus({
      autoAttachState: "failed",
      autoAttachReason: "attach_failed",
      ...overrides
    }),
    engineLane: "auto_media_element",
    streamState: "inactive",
    engineStatus: "ready"
  };
}
