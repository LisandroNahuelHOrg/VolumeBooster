/**
 * @fileoverview Renders the sticky popup toolbar markup.
 * @module popup/render-popup-toolbar
 */

import { escapeHtml } from "../shared/escape-html";
import { translate, type UiCatalog } from "../shared/runtime-i18n";
import type { PopupTheme } from "../shared/types";
import type { PopupView } from "./popup-ui-state";
import { POPUP_TOOLBAR_ICON_MARKUP, getPopupToolbarItems } from "./popup-toolbar";

export function renderPopupToolbar(
  popupTheme: PopupTheme,
  currentView: PopupView,
  catalog: UiCatalog
): string {
  const items = getPopupToolbarItems(popupTheme, currentView, catalog);

  return `
    <section class="popup-toolbar" aria-label="${escapeHtml(translate(catalog, "popupToolbarRegionLabel"))}">
      <div class="popup-toolbar__bar">
        ${items
          .map(
            (item) => `
              <button
                class="popup-toolbar__button ${item.isActive ? "is-active" : ""} ${item.isInert ? "is-inert" : ""}"
                data-action="${item.action}"
                data-popup-toolbar="${item.action}"
                aria-label="${escapeHtml(item.label)}"
                title="${escapeHtml(item.title)}"
                ${item.isInert ? 'aria-disabled="true"' : ""}
                ${item.isActive ? 'aria-pressed="true"' : ""}
                type="button"
              >
                <span class="popup-toolbar__icon" aria-hidden="true">
                  ${POPUP_TOOLBAR_ICON_MARKUP[item.icon]}
                </span>
                ${item.visibleLabel ? `<span class="popup-toolbar__text">${escapeHtml(item.visibleLabel)}</span>` : ""}
              </button>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}
