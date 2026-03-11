import type { ContentCommand } from "../../shared/messages";
import { delay } from "./delay";
import { injectRegisteredScriptsIntoTab } from "./inject-registered-scripts-into-tab";
import { isMissingReceiverError } from "./is-missing-receiver-error";
import { normalizeContentScriptError } from "./normalize-content-script-error";

export async function sendMessageToTab<T = void>(
  tabId: number,
  command: ContentCommand,
  attempts = 1
): Promise<T | undefined> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return (await chrome.tabs.sendMessage(tabId, command)) as T | undefined;
    } catch (error) {
      lastError = error;

      if (!isMissingReceiverError(error) || attempt === attempts - 1) {
        break;
      }

      await injectRegisteredScriptsIntoTab(tabId);
      await delay(50);
    }
  }

  throw normalizeContentScriptError(lastError);
}
