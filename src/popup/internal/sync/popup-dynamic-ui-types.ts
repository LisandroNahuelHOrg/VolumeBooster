import type { PopupViewModel } from "../../../shared/types";
import type { PopupMainViewRenderModel, PopupRenderContext } from "../render/popup-render-types";

export interface PopupDynamicUiInput {
  viewModel: PopupViewModel;
  renderContext: PopupRenderContext;
  sessionBoostAcknowledgedAction: string | null;
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
  sessionBoostVisible: boolean;
  sessionBoostAcknowledgedAction: string | null;
  protectionTelemetryDisplayKey: string;
  normalizationTelemetryDisplayKey: string;
  sessionCards: PopupDynamicSessionCardModel[];
}

export interface PopupUiSyncRuntime {
  lastProtectorTelemetryUiAt: number;
  lastProtectorTelemetryDisplayKey: string;
  lastNormalizationTelemetryUiAt: number;
  lastNormalizationTelemetryDisplayKey: string;
  lastLaneStatusDisplayKey: string;
  lastSessionBoostVisible: boolean;
}
