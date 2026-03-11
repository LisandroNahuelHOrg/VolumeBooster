/**
 * @fileoverview Applies locale metadata to the current document root.
 * @module shared/set-document-locale-attributes
 */

import { getUiLanguage } from "./get-ui-language";
import { isRtlLocale } from "./is-rtl-locale";

/**
 * Applies `lang` and `dir` attributes to the current document root.
 *
 * @param doc - Target document.
 * @param locale - Locale to apply.
 * @returns Applied locale metadata.
 */
export function setDocumentLocaleAttributes(
  doc: Document = document,
  locale = getUiLanguage()
): { lang: string; dir: "ltr" | "rtl" } {
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";
  doc.documentElement.lang = locale;
  doc.documentElement.dir = dir;
  return { lang: locale, dir };
}
