/**
 * @fileoverview Backwards-compatible catalog translation wrapper.
 * @module shared/translate-runtime-catalog-message
 */

import type {
  I18nKey,
  I18nSubstitutionsFor
} from "../generated/i18n-types";
import { t } from "./translate-runtime-message";
import type { UiCatalog } from "./runtime-i18n-types";

/** Backwards-compatible alias used by popup rendering helpers. */
export function translate<K extends I18nKey>(
  _catalog: UiCatalog,
  key: K,
  substitutions?: I18nSubstitutionsFor<K>
): string {
  return t(key, substitutions);
}
