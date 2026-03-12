import type {
  AutoActiveStrategy,
  AutoAttachReason,
  AutoAttachState,
  AutoFrameRuntimeState,
  CaptureSessionState,
  LocalizedMessage
} from "../../shared/types";
import type { AggregatedAutoTelemetry } from "./aggregated-auto-telemetry";

export function buildAggregatedAutoSession(params: {
  tabId: number;
  preferredFrame: AutoFrameRuntimeState;
  attachState: AutoAttachState;
  attachReason?: AutoAttachReason;
  activeStrategy: AutoActiveStrategy;
  gainPercent: number;
  telemetry: AggregatedAutoTelemetry;
  now: () => number;
  lastError?: LocalizedMessage;
}): CaptureSessionState | null {
  if (params.attachState !== "attached") {
    return null;
  }

  return {
    tabId: params.tabId,
    title: params.preferredFrame.title,
    url: params.preferredFrame.url,
    domain: params.preferredFrame.domain,
    favIconUrl: params.preferredFrame.favIconUrl,
    gainPercent: params.gainPercent,
    engineLane: "auto_media_element",
    autoBoosterScope: params.preferredFrame.autoBoosterScope,
    autoActiveStrategy: params.activeStrategy,
    autoAttachState: params.attachState,
    autoAttachReason: params.attachReason,
    streamState: "active",
    engineStatus: "ready",
    level: params.telemetry.level,
    warning: params.telemetry.warning,
    protectorActionDb: params.telemetry.protectorActionDb,
    clipEvents: params.telemetry.clipEvents,
    clipPeak: params.telemetry.clipPeak,
    protectionBypassed: params.telemetry.protectionBypassed,
    outputPeak: params.telemetry.outputPeak,
    updatedAt: params.now(),
    lastError: params.lastError
  };
}
