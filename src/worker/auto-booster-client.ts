import { AUTO_BOOSTER_CONTENT_SCRIPT_PATH } from "../shared/constants";
import { message, type ContentCommand } from "../shared/messages";
import type { AutoBoosterConfigPayload, AutoBoosterDebugState, LocalizedMessage } from "../shared/types";

export class AutoBoosterClient {
  async configure(tabId: number, payload: AutoBoosterConfigPayload): Promise<void> {
    await this.ensureInjected(tabId);
    await this.sendMessageToTab(tabId, {
      type: "AUTO_BOOSTER_CONFIGURE",
      payload
    });
  }

  async disable(tabId: number): Promise<void> {
    try {
      await this.sendMessageToTab(tabId, {
        type: "AUTO_BOOSTER_DISABLE",
        payload: { tabId }
      });
    } catch {
      // Missing receiver or navigated tab is fine during teardown.
    }
  }

  async getDebugState(tabId: number): Promise<AutoBoosterDebugState | null> {
    try {
      await this.ensureInjected(tabId);
    } catch {
      return null;
    }

    return (
      (await this.sendMessageToTab<AutoBoosterDebugState | null>(tabId, {
        type: "AUTO_BOOSTER_GET_DEBUG_STATE"
      })) ?? null
    );
  }

  async requestGlobalPermission(): Promise<boolean> {
    return chrome.permissions.request({
      origins: ["<all_urls>"]
    });
  }

  async hasGlobalPermission(): Promise<boolean> {
    return chrome.permissions.contains({
      origins: ["<all_urls>"]
    });
  }

  async queryInjectableTabs(): Promise<chrome.tabs.Tab[]> {
    return chrome.tabs.query({
      url: ["http://*/*", "https://*/*"]
    });
  }

  private async ensureInjected(tabId: number): Promise<void> {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: injectAutoBoosterModule,
        args: [chrome.runtime.getURL(AUTO_BOOSTER_CONTENT_SCRIPT_PATH)]
      });
    } catch (error) {
      throw normalizeContentScriptError(error);
    }
  }

  private async sendMessageToTab<T = void>(
    tabId: number,
    command: ContentCommand,
    attempts = 2
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

        await this.ensureInjected(tabId);
        await delay(50);
      }
    }

    throw normalizeContentScriptError(lastError);
  }
}

function isMissingReceiverError(error: unknown): boolean {
  return error instanceof Error && /Receiving end does not exist/i.test(error.message);
}

function normalizeContentScriptError(error: unknown): LocalizedMessage {
  if (
    error instanceof Error &&
    /Cannot access contents of the page|The extensions gallery cannot be scripted/i.test(error.message)
  ) {
    return message("errorAutoPermissionMissing");
  }

  return message("errorAutoAttachFailed");
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function injectAutoBoosterModule(moduleUrl: string): Promise<void> {
  const runtimeWindow = window as Window & {
    __PRISM_AUTO_BOOSTER_IMPORT_PROMISE__?: Promise<unknown>;
  };

  runtimeWindow.__PRISM_AUTO_BOOSTER_IMPORT_PROMISE__ ??= import(moduleUrl);
  await runtimeWindow.__PRISM_AUTO_BOOSTER_IMPORT_PROMISE__;
}
