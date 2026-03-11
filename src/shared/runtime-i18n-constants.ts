/**
 * @fileoverview Shared runtime i18n constants and lookup sets.
 * @module shared/runtime-i18n-constants
 */

import {
  I18N_KEYS,
  I18N_PLURAL_BASES
} from "../generated/i18n-types";

export const RTL_LOCALE_PREFIXES = ["ar", "fa", "he", "ps", "sd", "ug", "ur", "yi"] as const;
export const I18N_KEY_SET = new Set<string>(I18N_KEYS);
export const I18N_PLURAL_BASE_SET = new Set<string>(I18N_PLURAL_BASES);
