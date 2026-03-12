import type {
  AutoActiveStrategy,
  AutoAttachReason,
  AutoAttachState,
  AutoFrameRuntimeState,
  LocalizedMessage
} from "../../shared/types";
import type { AggregatedAutoTabState } from "./auto-tab-aggregation-contract";

export function buildAggregatedAutoTabState(params: {
  tabId: number;
  preferredFrame: AutoFrameRuntimeState;
  attachState: AutoAttachState;
  attachReason?: AutoAttachReason;
  activeStrategy: AutoActiveStrategy;
  gainPercent: number;
  lastError?: LocalizedMessage;
}): AggregatedAutoTabState {
  return {
    tabId: params.tabId,
    title: params.preferredFrame.title,
    url: params.preferredFrame.url,
    domain: params.preferredFrame.domain,
    favIconUrl: params.preferredFrame.favIconUrl,
    autoAttachState: params.attachState,
    autoAttachReason: params.attachReason,
    autoBoosterScope: params.preferredFrame.autoBoosterScope,
    autoActiveStrategy: params.activeStrategy,
    gainPercent: params.gainPercent,
    lastError: params.lastError
  };
}
