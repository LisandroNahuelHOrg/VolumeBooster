import type { CaptureSessionState } from "../../shared/types";

export function makePopupMainSession(
  overrides: Partial<CaptureSessionState> = {}
): CaptureSessionState {
  return {
    tabId: 91,
    title: "FocusStream",
    url: "https://example.com/watch",
    domain: "example.com",
    gainPercent: 175,
    engineLane: "manual_tab_capture",
    autoAttachState: "idle",
    streamState: "active",
    engineStatus: "ready",
    level: 0.26,
    warning: "none",
    protectorActionDb: 0,
    clipEvents: 0,
    clipPeak: 0,
    protectionBypassed: false,
    outputPeak: 0.26,
    updatedAt: 1,
    ...overrides
  };
}
