/**
 * @fileoverview Renders the sticky popup toolbar markup.
 * @module popup/render-popup-toolbar
 */

import type { UiCatalog } from "../shared/runtime-i18n";
import type { PopupTheme } from "../shared/types";
import type { PopupView } from "./popup-ui-state-types";
import { renderPopupToolbar as renderInternalPopupToolbar } from "./internal/render/render-popup-toolbar";

export function renderPopupToolbar(
  popupTheme: PopupTheme,
  currentView: PopupView,
  catalog: UiCatalog
): string {
  return renderInternalPopupToolbar({
    catalog,
    loadedLocale: null,
    popupTheme,
    currentView,
    draftGainPercent: 100,
    draftAdvancedAudioSettings: null,
    pendingAdvancedAudioSettings: null,
    transientError: null
  });
}
