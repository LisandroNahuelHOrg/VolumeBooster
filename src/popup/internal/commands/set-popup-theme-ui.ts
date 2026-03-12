import { syncPopupThemeUi } from "../dom/sync-popup-theme-ui";
import type { PopupTheme } from "../../../shared/types";
import type { PopupCommandContext } from "./popup-command-context";

export function setPopupThemeUi(
  context: PopupCommandContext,
  popupTheme: PopupTheme
): void {
  context.state.popupUiState = {
    ...context.state.popupUiState,
    popupTheme
  };
  syncPopupThemeUi(
    context.refs.rootElement,
    context.state.popupUiState.popupTheme,
    context.state.popupUiState.currentView,
    context.state.currentCatalog
  );
}
