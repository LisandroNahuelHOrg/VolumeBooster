/**
 * @fileoverview Detects whether a locale should render right-to-left.
 * @module shared/is-rtl-locale
 */

import { RTL_LOCALE_PREFIXES } from "./runtime-i18n-constants";

/**
 * Detects whether a locale should be rendered right-to-left.
 *
 * @param locale - Locale code to inspect.
 * @returns `true` when the locale belongs to a known RTL family.
 */
export function isRtlLocale(locale: string): boolean {
  const normalized = locale.toLowerCase();
  return RTL_LOCALE_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}-`));
}
