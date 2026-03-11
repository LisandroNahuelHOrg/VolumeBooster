/**
 * @fileoverview Returns the browser locale used by the current runtime.
 * @module shared/get-browser-locale
 */

import { getUiLanguage } from "./get-ui-language";

/** Returns the browser locale used by the current runtime. */
export function getBrowserLocale(): string {
  return getUiLanguage();
}
