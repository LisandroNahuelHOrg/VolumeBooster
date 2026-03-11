import type { LocalizedMessage } from "../../shared/types";

export function localizeFallbackToastMessage(messageValue: LocalizedMessage): string {
  let substitutions: string[] | undefined;

  if (messageValue.substitutions) {
    substitutions = [];

    for (const value of Object.values(messageValue.substitutions)) {
      substitutions.push(String(value));
    }
  }

  try {
    const localized = chrome.i18n?.getMessage?.(messageValue.key, substitutions) ?? "";
    return localized || messageValue.key;
  } catch {
    return messageValue.key;
  }
}
