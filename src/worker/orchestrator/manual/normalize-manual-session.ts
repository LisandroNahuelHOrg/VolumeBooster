import type { CaptureSessionState } from "../../../shared/types";

export function normalizeManualSession(session: CaptureSessionState): CaptureSessionState {
  return {
    ...session,
    engineLane: "manual_tab_capture",
    autoAttachState: "idle",
    autoAttachReason: undefined
  };
}
