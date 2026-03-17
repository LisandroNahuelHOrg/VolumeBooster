import { isProtectionBypassedSettings } from "../../../shared/audio-settings";
import type {
  CaptureSessionState,
  OffscreenSessionStartPayload
} from "../../../shared/types";

export const createSessionState = (
  payload: OffscreenSessionStartPayload,
  now: () => number
): CaptureSessionState => ({
  tabId: payload.tabId,
  title: payload.title,
  url: payload.url,
  domain: payload.domain,
  favIconUrl: payload.favIconUrl,
  gainPercent: payload.gainPercent,
  engineLane: "manual_tab_capture",
  autoAttachState: "idle",
  streamState: "pending",
  engineStatus: "loading",
  level: 0,
  warning: "none",
  protectorActionDb: 0,
  clipEvents: 0,
  clipPeak: 0,
  protectionBypassed: isProtectionBypassedSettings(payload.advancedAudioSettings),
  outputPeak: 0,
  updatedAt: now()
});
