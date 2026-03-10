/**
 * @fileoverview Toolbar metadata and SVG markup for the popup top actions.
 * @module popup/popup-toolbar
 */

import { translate, type UiCatalog } from "../shared/runtime-i18n";
import type { PopupTheme } from "../shared/types";
import type { PopupView } from "./popup-ui-state";

/** Supported inline icons used by the popup toolbar. */
export type PopupToolbarIconKey = "crown" | "sun" | "moon" | "settings_future";

/** Declarative descriptor used to render a popup toolbar button. */
export interface PopupToolbarItem {
  action: "premium-mock" | "toggle-popup-theme" | "open-popup-settings";
  icon: PopupToolbarIconKey;
  label: string;
  title: string;
  isActive: boolean;
  isInert: boolean;
}

/** Inline SVG markup sourced from the official coolicons pack. */
export const POPUP_TOOLBAR_ICON_MARKUP: Record<PopupToolbarIconKey, string> = {
  crown: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 18L5.9 9.2L12 13.2L18.1 9.2L20 18H4Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 18H20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="5.9" cy="8" r="1.4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="5.4" r="1.4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18.1" cy="8" r="1.4" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 4V2M12 20V22M6.41421 6.41421L5 5M17.728 17.728L19.1422 19.1422M4 12H2M20 12H22M17.7285 6.41421L19.1427 5M6.4147 17.728L5.00049 19.1422M12 17C9.23858 17 7 14.7614 7 12C7 9.23858 9.23858 7 12 7C14.7614 7 17 9.23858 17 12C17 14.7614 14.7614 17 12 17Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 6C9 10.9706 13.0294 15 18 15C18.9093 15 19.787 14.8655 20.6144 14.6147C19.4943 18.3103 16.0613 20.9999 12 20.9999C7.02944 20.9999 3 16.9707 3 12.0001C3 7.93883 5.69007 4.50583 9.38561 3.38574C9.13484 4.21311 9 5.09074 9 6Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  settings_future: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M13.6006 21.0761L19.0608 17.9236C19.6437 17.5871 19.9346 17.4188 20.1465 17.1834C20.3341 16.9751 20.4759 16.7297 20.5625 16.4632C20.6602 16.1626 20.6602 15.8267 20.6602 15.1568V8.84268C20.6602 8.17277 20.6602 7.83694 20.5625 7.53638C20.4759 7.26982 20.3341 7.02428 20.1465 6.816C19.9355 6.58161 19.6453 6.41405 19.0674 6.08043L13.5996 2.92359C13.0167 2.58706 12.7259 2.41913 12.416 2.35328C12.1419 2.295 11.8584 2.295 11.5843 2.35328C11.2744 2.41914 10.9826 2.58706 10.3997 2.92359L4.93843 6.07666C4.35623 6.41279 4.06535 6.58073 3.85352 6.816C3.66597 7.02428 3.52434 7.26982 3.43773 7.53638C3.33984 7.83765 3.33984 8.17436 3.33984 8.84742V15.1524C3.33984 15.8254 3.33984 16.1619 3.43773 16.4632C3.52434 16.7297 3.66597 16.9751 3.85352 17.1834C4.06548 17.4188 4.35657 17.5871 4.93945 17.9236L10.3997 21.0761C10.9826 21.4126 11.2744 21.5806 11.5843 21.6465C11.8584 21.7047 12.1419 21.7047 12.416 21.6465C12.7259 21.5806 13.0177 21.4126 13.6006 21.0761Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 11.9998C9 13.6566 10.3431 14.9998 12 14.9998C13.6569 14.9998 15 13.6566 15 11.9998C15 10.3429 13.6569 8.99976 12 8.99976C10.3431 8.99976 9 10.3429 9 11.9998Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
};

/**
 * Builds the three popup toolbar items for the current popup state.
 *
 * @param popupTheme - Active popup theme.
 * @param currentView - Active popup-local view.
 * @param catalog - Runtime i18n catalog.
 * @returns Ordered toolbar items for rendering.
 */
export function getPopupToolbarItems(
  popupTheme: PopupTheme,
  currentView: PopupView,
  catalog: UiCatalog
): PopupToolbarItem[] {
  const isLightTheme = popupTheme === "light";

  return [
    {
      action: "premium-mock",
      icon: "crown",
      label: translate(catalog, "popupToolbarPremiumLabel"),
      title: translate(catalog, "popupToolbarPremiumComingSoon"),
      isActive: false,
      isInert: true
    },
    {
      action: "toggle-popup-theme",
      icon: isLightTheme ? "moon" : "sun",
      label: translate(catalog, isLightTheme ? "popupToolbarThemeDarkLabel" : "popupToolbarThemeLightLabel"),
      title: translate(catalog, isLightTheme ? "popupToolbarThemeDarkLabel" : "popupToolbarThemeLightLabel"),
      isActive: false,
      isInert: false
    },
    {
      action: "open-popup-settings",
      icon: "settings_future",
      label: translate(catalog, "popupToolbarSettingsLabel"),
      title: translate(catalog, "popupToolbarSettingsLabel"),
      isActive: currentView === "settings",
      isInert: false
    }
  ];
}
