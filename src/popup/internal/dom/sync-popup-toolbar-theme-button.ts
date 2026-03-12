import type { UiCatalog } from "../../../shared/runtime-i18n";
import type { PopupTheme } from "../../../shared/types";
import { POPUP_TOOLBAR_ICON_MARKUP, getPopupToolbarItems } from "../../popup-toolbar";
import type { PopupView } from "../../popup-ui-state-types";

export function syncPopupToolbarThemeButton(
  rootElement: HTMLElement,
  popupTheme: PopupTheme,
  currentView: PopupView,
  catalog: UiCatalog | null
): void {
  if (!catalog) {
    return;
  }

  const toolbarButton = rootElement.querySelector<HTMLButtonElement>("[data-popup-toolbar='toggle-popup-theme']");

  if (!toolbarButton) {
    return;
  }

  const themeItem = getPopupToolbarItems(popupTheme, currentView, catalog).find(
    (item) => item.action === "toggle-popup-theme"
  );

  if (!themeItem) {
    return;
  }

  toolbarButton.setAttribute("aria-label", themeItem.label);
  toolbarButton.title = themeItem.title;
  toolbarButton.dataset.popupTheme = popupTheme;
  toolbarButton.dataset.popupThemeTarget = popupTheme === "light" ? "dark" : "light";
  const icon = toolbarButton.querySelector<HTMLElement>(".popup-toolbar__icon");

  if (icon) {
    icon.innerHTML = POPUP_TOOLBAR_ICON_MARKUP[themeItem.icon];
  }
}
