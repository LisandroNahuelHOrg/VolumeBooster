/**
 * @fileoverview Builds the ordered fallback list of pluralized message keys.
 * @module shared/get-plural-candidate-keys
 */

import type { I18nPluralBase } from "../generated/i18n-types";

/** Builds the ordered fallback list of pluralized message keys for a count. */
export function getPluralCandidateKeys(
  baseKey: I18nPluralBase,
  count: number,
  locale: string
): string[] {
  const category = new Intl.PluralRules(locale).select(count);
  const candidates =
    count === 0
      ? [`${baseKey}_zero`, `${baseKey}_${category}`, `${baseKey}_other`]
      : [`${baseKey}_${category}`, `${baseKey}_other`];

  return [...new Set(candidates)];
}
