import type { AutoSessionStatusPayload, CaptureSessionState } from "../../../shared/types";
import type { WorkerRuntimeState } from "../runtime-state";

export function createEmptyAutoSession(
  runtime: WorkerRuntimeState,
  update: AutoSessionStatusPayload
): CaptureSessionState {
  return {
    tabId: update.tabId,
    title: update.title,
    url: update.url,
    domain: update.domain,
    favIconUrl: update.favIconUrl,
    gainPercent: update.gainPercent,
    engineLane: "auto_media_element",
    autoBoosterScope: update.autoBoosterScope,
    autoActiveStrategy: update.autoActiveStrategy,
    autoAttachState: update.autoAttachState,
    autoAttachReason: update.autoAttachReason,
    streamState: update.streamState,
    engineStatus: update.engineStatus,
    level: 0,
    warning: "none",
    protectorActionDb: 0,
    clipEvents: 0,
    clipPeak: 0,
    protectionBypassed: false,
    outputPeak: 0,
    updatedAt: runtime.now(),
    lastError: update.lastError
  };
}
