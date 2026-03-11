import type { I18nKey, I18nSubstitutionsFor } from "../../generated/i18n-types";
import type { LocalizedMessage } from "../types";

export function createLocalizedMessage<K extends I18nKey>(
  key: K,
  substitutions?: I18nSubstitutionsFor<K>
): LocalizedMessage<K> {
  return substitutions ? { key, substitutions } : { key };
}
