import type { CaptureSessionState } from "../../../../shared/types";

export function makeSession(
  tabId: number,
  domain: string,
  gainPercent: number,
  overrides: Partial<CaptureSessionState> = {}
): CaptureSessionState {
  return {
    tabId,
    title: `Tab ${tabId}`,
    url: `https://${domain}/video`,
    domain,
    favIconUrl: `https://${domain}/favicon.ico`,
    gainPercent,
    engineLane: "manual_tab_capture",
    autoAttachState: "idle",
    streamState: "active",
    engineStatus: "ready",
    level: 0.3,
    warning: "none",
    protectorActionDb: 4.1,
    clipEvents: 0,
    clipPeak: 0,
    protectionBypassed: false,
    outputPeak: 0.52,
    updatedAt: 1,
    ...overrides
  };
}
