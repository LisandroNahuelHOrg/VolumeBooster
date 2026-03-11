import type { AutoSessionStatusPayload } from "../../../../shared/types";

export function makeAutoStatus(
  overrides: Partial<AutoSessionStatusPayload> = {}
): AutoSessionStatusPayload {
  return {
    tabId: 7,
    title: "YouTube",
    url: "https://youtube.com/watch?v=1",
    domain: "youtube.com",
    favIconUrl: "https://youtube.com/favicon.ico",
    autoAttachState: "attached",
    autoAttachReason: undefined,
    autoBoosterScope: "global",
    gainPercent: 220,
    engineLane: "auto_media_element",
    streamState: "active",
    engineStatus: "ready",
    ...overrides
  };
}
