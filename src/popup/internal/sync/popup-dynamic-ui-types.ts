import type { PopupViewModel } from "../../../shared/types";
import type { PopupMainViewRenderModel, PopupRenderContext } from "../render/popup-render-types";

export interface PopupDynamicUiInput {
  viewModel: PopupViewModel;
  renderContext: PopupRenderContext;
  sessionCarouselOffset: number;
}

export interface PopupDynamicSessionCardModel {
  tabId: number;
  visualStatus: string;
  statusText: string;
  gainText: string;
  levelText: string;
  warningTone: string;
  warningText: string;
  protectionActionText: string;
  clipEventsText: string;
  meterWidthPercent: number;
}

export interface PopupDynamicUiModel {
  renderModel: PopupMainViewRenderModel;
  currentStatus: string;
  currentStatusText: string;
  meterValueText: string;
  warningText: string;
  sessionSummaryText: string;
  laneStatusDisplayKey: string;
  siteLaneDisplayKey: string;
  globalLaneDisplayKey: string;
  protectionTelemetryDisplayKey: string;
  sessionCards: PopupDynamicSessionCardModel[];
}

export interface PopupUiSyncRuntime {
  lastProtectorTelemetryUiAt: number;
  lastProtectorTelemetryDisplayKey: string;
  lastLaneStatusDisplayKey: string;
}
