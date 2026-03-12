import type { LocalizedMessage } from "../../shared/types";
import { getI18nMessageSafe } from "../runtime-api";

export function localizeFallbackToastMessage(messageValue: LocalizedMessage): string {
  let substitutions: string[] | undefined;

  if (messageValue.substitutions) {
    substitutions = [];

    for (const value of Object.values(messageValue.substitutions)) {
      substitutions.push(String(value));
    }
  }

  return getI18nMessageSafe(messageValue.key, substitutions);
}
