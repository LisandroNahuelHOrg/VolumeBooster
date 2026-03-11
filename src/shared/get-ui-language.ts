/**
 * @fileoverview Resolves the current UI language for the extension runtime.
 * @module shared/get-ui-language
 */

import { getChromeI18n } from "./get-chrome-i18n";
import type { ChromeI18nLike } from "./runtime-i18n-types";

/**
 * Resolves the UI language used by the extension.
 *
 * @param api - Optional injected Chrome i18n implementation.
 * @returns Current UI locale code.
 */
export function getUiLanguage(api: ChromeI18nLike | null = getChromeI18n()): string {
  return api?.getUILanguage?.() ?? globalThis.navigator?.language ?? "en";
}
