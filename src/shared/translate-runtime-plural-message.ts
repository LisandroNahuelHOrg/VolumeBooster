/**
 * @fileoverview Resolves pluralized runtime messages through Chrome i18n.
 * @module shared/translate-runtime-plural-message
 */

import type {
  I18nKey,
  I18nPluralBase,
  I18nSubstitutionsFor
} from "../generated/i18n-types";
import { getChromeI18n } from "./get-chrome-i18n";
import { getUiLanguage } from "./get-ui-language";
import { getPluralCandidateKeys } from "./get-plural-candidate-keys";
import { I18N_KEY_SET } from "./runtime-i18n-constants";
import { t } from "./translate-runtime-message";
import type { ChromeI18nLike } from "./runtime-i18n-types";

/**
 * Resolves a pluralized message family for the given count.
 *
 * @param baseKey - Base plural family key.
 * @param count - Count used to select the plural category.
 * @param substitutions - Optional placeholders for the final message.
 * @param api - Optional injected i18n implementation.
 * @param locale - Locale used for plural rules.
 * @returns Localized pluralized string or the numeric count as fallback.
 */
export function tp<B extends I18nPluralBase>(
  baseKey: B,
  count: number,
  substitutions?: I18nSubstitutionsFor<Extract<I18nKey, `${B}_${"other"}`>>,
  api: ChromeI18nLike | null = getChromeI18n(),
  locale = getUiLanguage(api)
): string {
  const candidateKeys = getPluralCandidateKeys(baseKey, count, locale);

  for (const candidateKey of candidateKeys) {
    if (I18N_KEY_SET.has(candidateKey)) {
      return t(
        candidateKey as Extract<I18nKey, `${B}_${"zero" | "one" | "two" | "few" | "many" | "other"}`>,
        substitutions as I18nSubstitutionsFor<Extract<I18nKey, `${B}_${"zero" | "one" | "two" | "few" | "many" | "other"}`>>,
        api
      );
    }
  }

  return String(count);
}
