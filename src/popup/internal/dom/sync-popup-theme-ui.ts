import type { UiCatalog } from "../../../shared/runtime-i18n";
import type { PopupTheme } from "../../../shared/types";
import { applyPopupTheme } from "../../popup-ui-state";
import type { PopupView } from "../../popup-ui-state-types";
import { syncPopupSettingsThemeSummary } from "./sync-popup-settings-theme-summary";
import { syncPopupToolbarThemeButton } from "./sync-popup-toolbar-theme-button";

export function syncPopupThemeUi(
  rootElement: HTMLElement,
  popupTheme: PopupTheme,
  currentView: PopupView,
  catalog: UiCatalog | null
): void {
  applyPopupTheme(popupTheme);

  const appShell = rootElement.querySelector<HTMLElement>(".app-shell");

  if (appShell) {
    appShell.dataset.popupTheme = popupTheme;
  }

  if (!catalog) {
    return;
  }

  syncPopupToolbarThemeButton(rootElement, popupTheme, currentView, catalog);
  syncPopupSettingsThemeSummary(rootElement, popupTheme, catalog);
}
