import type { LocalizedMessage, PopupViewModel } from "../../../shared/types";
import type { PopupUiState } from "../../popup-ui-state-types";

export function createPopupRenderSignature(
  viewModel: PopupViewModel,
  popupUiState: PopupUiState,
  transientError: LocalizedMessage | null
): string {
  const activeSessions = [];

  for (const session of viewModel.activeSessions) {
    activeSessions.push({
      domain: session.domain,
      lane: session.engineLane,
      tabId: session.tabId,
      title: session.title
    });
  }

  return JSON.stringify({
    popupView: popupUiState.currentView,
    transientError: transientError?.key ?? null,
    currentTab: viewModel.currentTab
      ? {
          tabId: viewModel.currentTab.tabId,
          title: viewModel.currentTab.title,
          domain: viewModel.currentTab.domain,
          supported: viewModel.currentTab.supported,
          activeLane: viewModel.currentTab.activeLane,
          autoBoosterScope: viewModel.currentTab.autoBoosterScope,
          autoAttachState: viewModel.currentTab.autoAttachState,
          autoAttachReason: viewModel.currentTab.autoAttachReason
        }
      : null,
    currentSession: viewModel.currentSession
      ? {
          tabId: viewModel.currentSession.tabId,
          lane: viewModel.currentSession.engineLane,
          scope: viewModel.currentSession.autoBoosterScope,
          state: viewModel.currentSession.streamState
        }
      : null,
    currentManualSession: viewModel.currentManualSession
      ? { tabId: viewModel.currentManualSession.tabId }
      : null,
    autoBoosterMode: viewModel.autoBoosterMode,
    premiumEntitlement: viewModel.premiumEntitlement,
    premiumDrafts: popupUiState.currentView === "premium"
      ? {
          email: transientError?.key ? "dirty" : "clean"
        }
      : null,
    activeSessions
  });
}
