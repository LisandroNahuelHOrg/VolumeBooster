import type { PopupUiState } from "./popup-ui-state-types";

export function closePopupPremium(state: PopupUiState): PopupUiState {
  return {
    ...state,
    currentView: "main"
  };
}
