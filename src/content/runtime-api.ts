/**
 * @fileoverview Safe wrappers around extension APIs used by content scripts.
 *
 * Chrome invalidates old content-script contexts when the extension reloads.
 * In that state, direct calls to `chrome.runtime.*` or `chrome.i18n.*` may
 * throw synchronously. These helpers keep stale scripts quiet.
 */

import type { I18nKey } from "../generated/i18n-types";
import { getFallbackMessage } from "../shared/runtime-i18n";

export async function sendRuntimeMessageSafe<T = unknown>(message: unknown): Promise<T | undefined> {
  try {
    return (await chrome.runtime.sendMessage(message)) as T | undefined;
  } catch {
    return undefined;
  }
}

export function addRuntimeMessageListenerSafe(
  listener: Parameters<typeof chrome.runtime.onMessage.addListener>[0]
): boolean {
  try {
    chrome.runtime.onMessage.addListener(listener);
    return true;
  } catch {
    return false;
  }
}

export function getI18nMessageSafe(key: I18nKey | string, substitutions?: string[]): string {
  try {
    const message = chrome.i18n?.getMessage?.(key, substitutions) ?? "";

    if (message) {
      return message;
    }
  } catch {
    // Fall through to the generated English catalog when the extension context is stale.
  }

  return getFallbackMessage(key, substitutions) ?? key;
}

export function getRuntimeUrlSafe(path: string): string | null {
  try {
    return chrome.runtime.getURL(path);
  } catch {
    return null;
  }
}
