import { deriveWarning } from "../../../shared/gain";
import { formatLocalizedMessage } from "../../../shared/runtime-i18n";
import { getQualityPresetCopy, getQualityPresetSubtitleCopy } from "../../quality-preset-copy";
import { getQualityProtectorModeCopy, getQualityProtectorSubtitleCopy } from "../../quality-protector-copy";
import { getLaneButtonCopy } from "../../lane-button-copy";
import { buildSessionCarouselModel } from "../../session-carousel";
import { deriveLiveActivityPercent } from "../../live-activity";
import type { PopupViewModel } from "../../../shared/types";
import { formatClipPeak } from "../format/format-clip-peak";
import { formatClippingSafety } from "../format/format-clipping-safety";
import { formatProtectionAction } from "../format/format-protection-action";
import { formatProtectionLoad } from "../format/format-protection-load";
import { getClippingSafetyAlert } from "../format/get-clipping-safety-alert";
import { getVisibleAdvancedAudioSettings } from "../state/get-visible-advanced-audio-settings";
import { getLaneStatus } from "../status/get-lane-status";
import { globalBoosterButtonAction } from "../status/global-booster-button-action";
import { isGlobalAutoEnabled } from "../status/is-global-auto-enabled";
import { isSiteAutoEnabled } from "../status/is-site-auto-enabled";
import { createSessionBoostActionBarMarkup } from "./create-session-boost-action-bar-markup";
import type { PopupMainViewRenderResult, PopupRenderContext } from "./popup-render-types";
import { resolveSessionBoostBarState } from "../../resolve-session-boost-bar-state";

export function createMainViewRenderModel(
  viewModel: PopupViewModel,
  renderContext: PopupRenderContext,
  sessionCarouselOffset: number
): PopupMainViewRenderResult {
  if (!renderContext.catalog) {
    throw new Error("Popup render catalog is required to build the main view render model.");
  }

  const currentSession = viewModel.currentSession;
  const currentTab = viewModel.currentTab;
  const advancedAudioSettings = getVisibleAdvancedAudioSettings(
    viewModel,
    renderContext.draftAdvancedAudioSettings,
    renderContext.pendingAdvancedAudioSettings
  );
  const protectionBypassed =
    currentSession?.protectionBypassed ?? advancedAudioSettings.qualityProtectorMode === "off";
  const sessionCarousel = buildSessionCarouselModel(viewModel.activeSessions, sessionCarouselOffset);
  const sessionBoostBarState = resolveSessionBoostBarState(viewModel, {
    currentView: renderContext.currentView,
    draftGainPercent: renderContext.draftGainPercent,
    draftAdvancedAudioSettings: renderContext.draftAdvancedAudioSettings,
    pendingAdvancedAudioSettings: renderContext.pendingAdvancedAudioSettings
  });

  return {
    model: {
      catalog: renderContext.catalog,
      loadedLocale: renderContext.loadedLocale,
      transientErrorMessage: renderContext.transientError
        ? formatLocalizedMessage(renderContext.transientError)
        : null,
      currentTab,
      currentTabId: currentTab?.tabId,
      activeSessionsCount: viewModel.activeSessions.length,
      advancedAudioSettings,
      draftGainPercent: renderContext.draftGainPercent,
      currentWarning: currentSession?.warning ?? deriveWarning(renderContext.draftGainPercent, 0),
      levelPercent: deriveLiveActivityPercent(currentSession?.level),
      laneStatus: getLaneStatus(viewModel, renderContext.catalog),
      siteAutoEnabled: isSiteAutoEnabled(viewModel),
      globalAutoEnabled: isGlobalAutoEnabled(viewModel),
      sessionBoostVisible: sessionBoostBarState.visible,
      sessionBoostActionBarMarkup: createSessionBoostActionBarMarkup(viewModel, renderContext),
      siteLaneButtonCopy: getLaneButtonCopy(
        "current-tab",
        isSiteAutoEnabled(viewModel),
        renderContext.catalog
      ),
      globalLaneButtonCopy: getLaneButtonCopy(
        "all-sites",
        isGlobalAutoEnabled(viewModel),
        renderContext.catalog
      ),
      globalAutoAction: globalBoosterButtonAction(viewModel),
      controlsLocked: !currentTab,
      protectionBypassed,
      qualityProtectorModeLabel: getQualityProtectorModeCopy(
        advancedAudioSettings.qualityProtectorMode,
        renderContext.catalog
      ),
      qualityProtectorSubtitle: getQualityProtectorSubtitleCopy(
        advancedAudioSettings.qualityProtectorMode,
        renderContext.catalog
      ),
      qualityPresetLabel: getQualityPresetCopy(advancedAudioSettings.qualityPreset, renderContext.catalog),
      qualityPresetSubtitle: getQualityPresetSubtitleCopy(
        advancedAudioSettings.qualityPreset,
        renderContext.catalog
      ),
      protectionAction: formatProtectionAction(
        currentSession?.protectorActionDb ?? 0,
        protectionBypassed,
        renderContext.catalog
      ),
      clipEvents: String(currentSession?.clipEvents ?? 0),
      clipEventsAlert: (currentSession?.clipEvents ?? 0) > 0 ? "danger" : "none",
      clipPeak: formatClipPeak(currentSession?.clipPeak ?? 0, renderContext.catalog),
      clipPeakAlert: (currentSession?.clipPeak ?? 0) > 1 ? "danger" : "none",
      protectionLoad: formatProtectionLoad(currentSession),
      clippingSafety: formatClippingSafety(currentSession?.outputPeak ?? 0, renderContext.catalog),
      clippingSafetyAlert: getClippingSafetyAlert(
        currentSession?.outputPeak ?? 0,
        currentSession?.clipEvents ?? 0
      ),
      sessionCarousel
    },
    nextSessionCarouselOffset: sessionCarousel.offset
  };
}
