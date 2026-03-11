/**
 * @fileoverview Formats structured localized message descriptors.
 * @module shared/format-localized-message
 */

import type { I18nSubstitutionsFor } from "../generated/i18n-types";
import type { LocalizedMessage } from "./types";
import { t } from "./translate-runtime-message";

/**
 * Formats a localized message descriptor received over runtime messaging.
 *
 * @param messageValue - Structured localized message.
 * @returns Human-readable translated string.
 */
export function formatLocalizedMessage(messageValue?: LocalizedMessage | null): string {
  if (!messageValue) {
    return "";
  }

  return t(messageValue.key, messageValue.substitutions as I18nSubstitutionsFor<typeof messageValue.key>);
}
