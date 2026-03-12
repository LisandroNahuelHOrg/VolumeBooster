import { deriveSessionMeterWidthPercent } from "../../live-activity";
import { sessionSummaryCopy } from "../copy/session-summary-copy";
import { statusCopy } from "../copy/status-copy";
import { warningCopy } from "../copy/warning-copy";
import { formatLevelPercent } from "../format/format-level-percent";
import { formatProtectionAction } from "../format/format-protection-action";
import { createMainViewRenderModel } from "../render/create-main-view-render-model";
import { getVisualStatus } from "../status/get-visual-status";
import type { PopupDynamicUiInput, PopupDynamicUiModel } from "./popup-dynamic-ui-types";

export function createPopupDynamicUiModel(input: PopupDynamicUiInput): PopupDynamicUiModel {
  const renderModel = createMainViewRenderModel(
    input.viewModel,
    input.renderContext,
    input.sessionCarouselOffset
  ).model;
  const currentStatus = getVisualStatus(
    input.viewModel.currentSession,
    input.viewModel.currentTab?.supported ?? false
  );

  return {
    renderModel,
    currentStatus,
    currentStatusText: statusCopy(currentStatus, renderModel.catalog),
    meterValueText: `${renderModel.levelPercent}%`,
    warningText: warningCopy(renderModel.currentWarning, renderModel.catalog),
    sessionSummaryText: sessionSummaryCopy(renderModel.activeSessionsCount, renderModel.catalog),
    laneStatusDisplayKey: [
      renderModel.laneStatus.tone,
      renderModel.laneStatus.badge,
      renderModel.laneStatus.title,
      renderModel.laneStatus.detail
    ].join("|"),
    siteLaneDisplayKey: `${renderModel.siteAutoEnabled}|${renderModel.siteLaneButtonCopy.action}|${renderModel.siteLaneButtonCopy.mode}`,
    globalLaneDisplayKey: `${renderModel.globalAutoEnabled}|${renderModel.globalLaneButtonCopy.action}|${renderModel.globalLaneButtonCopy.mode}`,
    protectionTelemetryDisplayKey: [
      input.viewModel.currentSession?.tabId ?? "none",
      input.viewModel.currentSession?.streamState ?? "inactive",
      renderModel.advancedAudioSettings.qualityProtectorMode,
      renderModel.protectionBypassed ? "bypassed" : "protected"
    ].join("|"),
    sessionCards: input.viewModel.activeSessions.map((session) => {
      const visualStatus = getVisualStatus(session, true);

      return {
        tabId: session.tabId,
        visualStatus,
        statusText: statusCopy(visualStatus, renderModel.catalog),
        gainText: `${session.gainPercent}%`,
        levelText: formatLevelPercent(session.level),
        warningTone: session.warning,
        warningText: warningCopy(session.warning, renderModel.catalog),
        protectionActionText: formatProtectionAction(
          session.protectorActionDb,
          session.protectionBypassed,
          renderModel.catalog
        ),
        clipEventsText: String(session.clipEvents),
        meterWidthPercent: deriveSessionMeterWidthPercent(session.level)
      };
    })
  };
}
