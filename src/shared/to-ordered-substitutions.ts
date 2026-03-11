/**
 * @fileoverview Maps named substitutions into Chrome's ordered array form.
 * @module shared/to-ordered-substitutions
 */

import {
  I18N_PLACEHOLDER_ORDER,
  type I18nKey,
  type I18nSubstitutionsFor
} from "../generated/i18n-types";

/** Maps named placeholder substitutions into Chrome's ordered substitution array. */
export function toOrderedSubstitutions<K extends I18nKey>(
  key: K,
  substitutions?: I18nSubstitutionsFor<K>
): string[] {
  if (!substitutions) {
    return [];
  }

  const orderedKeys = I18N_PLACEHOLDER_ORDER[key] ?? [];
  const substitutionMap = substitutions as Record<string, string | number>;

  return orderedKeys.map((placeholderKey) => String(substitutionMap[placeholderKey] ?? ""));
}
