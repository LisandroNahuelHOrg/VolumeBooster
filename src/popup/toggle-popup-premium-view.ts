import { closePopupPremium } from "./close-popup-premium";
import { openPopupPremium } from "./open-popup-premium";
import type { PopupUiState } from "./popup-ui-state-types";

export function togglePopupPremiumView(state: PopupUiState): PopupUiState {
  return state.currentView === "premium"
    ? closePopupPremium(state)
    : openPopupPremium(state);
}
