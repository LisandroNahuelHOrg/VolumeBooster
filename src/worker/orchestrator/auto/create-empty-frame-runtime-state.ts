import type {
  AutoFrameRuntimeState,
  AutoFrameTarget,
  AutoSessionStatusPayload
} from "../../../shared/types";

export function createEmptyFrameRuntimeState(
  tabId: number,
  target: AutoFrameTarget,
  update: Pick<AutoSessionStatusPayload, "title" | "url" | "domain" | "favIconUrl" | "gainPercent"> &
    Partial<Pick<AutoSessionStatusPayload, "autoBoosterScope" | "autoActiveStrategy" | "lastError">>
): AutoFrameRuntimeState {
  return {
    tabId,
    frameId: target.frameId,
    documentId: target.documentId,
    isTopFrame: target.frameId === 0,
    frameUrl: update.url,
    title: update.title,
    url: update.url,
    domain: update.domain,
    favIconUrl: update.favIconUrl,
    autoAttachState: "observing",
    autoAttachReason: "no_media",
    autoBoosterScope: update.autoBoosterScope,
    autoActiveStrategy: update.autoActiveStrategy ?? "none",
    gainPercent: update.gainPercent,
    ready: true,
    streamState: "inactive",
    engineStatus: "ready",
    level: 0,
    warning: "none",
    protectorActionDb: 0,
    clipEvents: 0,
    clipPeak: 0,
    protectionBypassed: false,
    outputPeak: 0,
    normalizationInputLoudnessDb: null,
    normalizationAppliedGainDb: 0,
    normalizationOffsetScore: 0,
    normalizationAction: "holding",
    normalizationLoadPercent: 0,
    lastError: update.lastError
  };
}
