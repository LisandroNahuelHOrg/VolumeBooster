/**
 * @fileoverview Popup view-model derivation from the worker snapshot.
 * @module popup/model
 */

import { DEFAULT_GAIN_PERCENT } from "../shared/constants";
import { DEFAULT_PREMIUM_ENTITLEMENT_STATE } from "../shared/premium-license";
import type { PopupViewModel, WorkerState } from "../shared/types";

/**
 * Projects worker state into the smaller popup-specific view model.
 *
 * @param state - Full worker snapshot received through runtime messaging.
 * @returns View model used by popup rendering and interaction logic.
 */
export function buildPopupViewModel(state: WorkerState): PopupViewModel {
  const currentTabId = typeof state.currentTab?.tabId === "number" ? state.currentTab.tabId : -1;
  const hasCurrentTab = currentTabId > -1;
  const currentTabSessions = hasCurrentTab
    ? state.sessions.filter((session) => session.tabId === currentTabId)
    : [];
  const currentSession = currentTabSessions[0] ?? null;
  const currentManualSession =
    currentTabSessions.find((session) => session.engineLane === "manual_tab_capture") ?? null;
  const currentAutoSession =
    currentTabSessions.find((session) => session.engineLane === "auto_media_element") ?? null;

  return {
    currentTab: state.currentTab,
    currentSession,
    currentManualSession,
    currentAutoSession,
    activeSessions: state.sessions,
    advancedAudioSettings: state.advancedAudioSettings,
    autoBoosterMode: state.autoBoosterMode,
    boostSettingsBundle: state.boostSettingsBundle,
    globalAutoGainPercent: state.globalAutoGainPercent,
    hasGlobalPermission: state.hasGlobalPermission,
    premiumEntitlement: state.premiumEntitlement ?? DEFAULT_PREMIUM_ENTITLEMENT_STATE,
    sessionBoostPromptState: state.sessionBoostPromptState,
    gainPercent:
      currentSession?.gainPercent ??
      state.boostSettingsBundle?.gainPercent ??
      (state.autoBoosterMode === "global" ? state.globalAutoGainPercent : DEFAULT_GAIN_PERCENT),
    sessionCount: state.sessions.length,
    canStart: state.currentTab?.supported === true
  };
}
