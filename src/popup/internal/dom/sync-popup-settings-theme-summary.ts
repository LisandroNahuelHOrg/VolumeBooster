import { getPopupThemeDisplayName } from "../copy/get-popup-theme-display-name";
import type { UiCatalog } from "../../../shared/runtime-i18n";
import type { PopupTheme } from "../../../shared/types";

export function syncPopupSettingsThemeSummary(
  rootElement: HTMLElement,
  popupTheme: PopupTheme,
  catalog: UiCatalog | null
): void {
  const themeName = getPopupThemeDisplayName(popupTheme, catalog);

  for (const themeNameNode of rootElement.querySelectorAll<HTMLElement>("[data-role='popup-theme-name']")) {
    themeNameNode.textContent = themeName;
  }
}
