/**
 * @fileoverview Facade exports for runtime i18n helpers.
 * @module shared/runtime-i18n
 */

export { formatLocalizedMessage } from "./format-localized-message";
export { getBrowserLocale } from "./get-browser-locale";
export { getFallbackMessage } from "./get-fallback-message";
export { getUiLanguage } from "./get-ui-language";
export { isPluralBaseKey } from "./is-plural-base-key";
export { isRtlLocale } from "./is-rtl-locale";
export { loadLocaleCatalog } from "./load-locale-catalog";
export { setDocumentLocaleAttributes } from "./set-document-locale-attributes";
export { t } from "./translate-runtime-message";
export { tp } from "./translate-runtime-plural-message";
export { translate } from "./translate-runtime-catalog-message";
export type {
  ChromeI18nLike,
  UiCatalog,
  UiMessageKey
} from "./runtime-i18n-types";
