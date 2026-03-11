/**
 * @fileoverview Resolves canonical English fallback i18n messages.
 * @module shared/get-fallback-message
 */

import { I18N_FALLBACK_MESSAGES } from "../generated/i18n-fallback";
import {
  I18N_PLACEHOLDER_ORDER,
  type I18nKey
} from "../generated/i18n-types";
import { escapeRegExp } from "./escape-reg-exp";

/**
 * Resolves the canonical English fallback message for a known i18n key.
 *
 * @param key - Message key to resolve.
 * @param substitutions - Optional ordered substitutions.
 * @returns English fallback string when the key exists in the canonical catalog.
 */
export function getFallbackMessage(
  key: string,
  substitutions?: readonly (string | number)[]
): string | null {
  const template = I18N_FALLBACK_MESSAGES[key as keyof typeof I18N_FALLBACK_MESSAGES];

  if (typeof template !== "string" || template.length === 0) {
    return null;
  }

  const substitutionValues = substitutions?.map((value) => String(value)) ?? [];
  const orderedKeys = I18N_PLACEHOLDER_ORDER[key as I18nKey] ?? [];
  let resolved: string = template;

  orderedKeys.forEach((placeholderKey, index) => {
    const replacement = substitutionValues[index] ?? "";
    resolved = resolved.replaceAll(new RegExp(`\\$${escapeRegExp(placeholderKey)}\\$`, "gi"), replacement);
  });

  substitutionValues.forEach((replacement, index) => {
    resolved = resolved.replaceAll(`$${index + 1}`, replacement);
  });

  return resolved;
}
