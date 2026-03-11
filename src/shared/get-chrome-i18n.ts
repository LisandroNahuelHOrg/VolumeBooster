/**
 * @fileoverview Returns the active Chrome i18n API when available.
 * @module shared/get-chrome-i18n
 */

import type { ChromeI18nLike } from "./runtime-i18n-types";

/** Returns the active Chrome i18n API when available. */
export function getChromeI18n(): ChromeI18nLike | null {
  return typeof chrome !== "undefined" && chrome.i18n ? chrome.i18n : null;
}
