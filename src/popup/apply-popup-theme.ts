/**
 * @fileoverview Applies the popup theme to the document root.
 * @module popup/apply-popup-theme
 */

import type { PopupTheme } from "../shared/types";

/**
 * Applies the popup theme to the current document root.
 *
 * @param popupTheme - Theme to apply.
 * @param doc - Target document receiving the data attribute.
 */
export function applyPopupTheme(popupTheme: PopupTheme, doc: Document = document): void {
  doc.documentElement.dataset.popupTheme = popupTheme;
}
