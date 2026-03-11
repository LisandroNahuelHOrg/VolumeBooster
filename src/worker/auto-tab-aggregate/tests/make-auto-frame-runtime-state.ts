import type { AutoFrameRuntimeState } from "../../../shared/types";

export function makeAutoFrameRuntimeState(
  overrides: Partial<AutoFrameRuntimeState> = {}
): AutoFrameRuntimeState {
  const autoAttachReason = Object.prototype.hasOwnProperty.call(overrides, "autoAttachReason")
    ? overrides.autoAttachReason
    : "no_media";
  const gainPercent = Object.prototype.hasOwnProperty.call(overrides, "gainPercent")
    ? overrides.gainPercent
    : 220;
  const lastError = Object.prototype.hasOwnProperty.call(overrides, "lastError") ? overrides.lastError : undefined;

  return {
    tabId: 7,
    frameId: overrides.frameId ?? 0,
    documentId: overrides.documentId ?? `doc-${overrides.frameId ?? 0}`,
    isTopFrame: overrides.isTopFrame ?? true,
    frameUrl: overrides.frameUrl ?? "https://example.com",
    title: overrides.title ?? "Example",
    url: overrides.url ?? "https://example.com",
    domain: overrides.domain ?? "example.com",
    favIconUrl: overrides.favIconUrl,
    autoAttachState: overrides.autoAttachState ?? "observing",
    autoAttachReason,
    autoBoosterScope: overrides.autoBoosterScope ?? "global",
    autoActiveStrategy: overrides.autoActiveStrategy ?? "none",
    gainPercent,
    ready: overrides.ready ?? true,
    streamState: overrides.streamState ?? "inactive",
    engineStatus: overrides.engineStatus ?? "ready",
    level: overrides.level ?? 0,
    warning: overrides.warning ?? "none",
    protectorActionDb: overrides.protectorActionDb ?? 0,
    clipEvents: overrides.clipEvents ?? 0,
    clipPeak: overrides.clipPeak ?? 0,
    protectionBypassed: overrides.protectionBypassed ?? false,
    outputPeak: overrides.outputPeak ?? 0,
    lastError,
    bridgeContextCount: overrides.bridgeContextCount,
    bridgeAttachedNodeCount: overrides.bridgeAttachedNodeCount,
    toastVisible: overrides.toastVisible ?? false
  } as AutoFrameRuntimeState;
}
