/**
 * @fileoverview Checks whether a value is a known plural-message base key.
 * @module shared/is-plural-base-key
 */

import type { I18nPluralBase } from "../generated/i18n-types";
import { I18N_PLURAL_BASE_SET } from "./runtime-i18n-constants";

/** Checks whether a string is a known plural-message base key. */
export function isPluralBaseKey(value: string): value is I18nPluralBase {
  return I18N_PLURAL_BASE_SET.has(value);
}
