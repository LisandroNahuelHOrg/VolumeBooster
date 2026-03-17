import type { PopupUiState } from "./popup-ui-state-types";

export function openPopupPremium(state: PopupUiState): PopupUiState {
  return {
    ...state,
    currentView: "premium"
  };
}
