/**
 * @fileoverview Resolves translated runtime messages through Chrome i18n.
 * @module shared/translate-runtime-message
 */

import type {
  I18nKey,
  I18nSubstitutionsFor
} from "../generated/i18n-types";
import { getChromeI18n } from "./get-chrome-i18n";
import { getFallbackMessage } from "./get-fallback-message";
import { toOrderedSubstitutions } from "./to-ordered-substitutions";
import type { ChromeI18nLike } from "./runtime-i18n-types";

/**
 * Resolves a translated message key using Chrome's native i18n API.
 *
 * @param key - Message key to resolve.
 * @param substitutions - Named substitutions matching the generated schema.
 * @param api - Optional injected i18n implementation.
 * @returns Localized string, or the key itself when i18n is unavailable.
 */
export function t<K extends I18nKey>(
  key: K,
  substitutions?: I18nSubstitutionsFor<K>,
  api: ChromeI18nLike | null = getChromeI18n()
): string {
  const chromeI18n = api ?? getChromeI18n();
  const orderedSubstitutions = toOrderedSubstitutions(key, substitutions);

  if (chromeI18n) {
    const message =
      orderedSubstitutions.length === 0
        ? chromeI18n.getMessage(key)
        : chromeI18n.getMessage(key, orderedSubstitutions);

    if (message) {
      return message;
    }
  }

  return getFallbackMessage(key, orderedSubstitutions) ?? key;
}
