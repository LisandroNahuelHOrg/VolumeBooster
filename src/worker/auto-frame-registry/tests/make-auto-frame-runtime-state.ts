import type { AutoFrameRuntimeState } from "../../../shared/types";

export function makeAutoFrameRuntimeState(
  overrides: Partial<AutoFrameRuntimeState> = {}
): AutoFrameRuntimeState {
  return {
    tabId: 50,
    title: "Frame",
    frameId: 0,
    documentId: "doc-default",
    isTopFrame: true,
    frameUrl: "https://example.com",
    url: "https://example.com",
    ready: true,
    toastVisible: false,
    autoAttachState: "observing",
    autoAttachReason: "no_media",
    autoActiveStrategy: "none",
    bridgeContextCount: 0,
    bridgeAttachedNodeCount: 0,
    gainPercent: 220,
    streamState: "inactive",
    engineStatus: "ready",
    level: 0,
    warning: "none",
    protectorActionDb: 0,
    clipEvents: 0,
    clipPeak: 0,
    protectionBypassed: false,
    outputPeak: 0,
    ...overrides
  };
}
