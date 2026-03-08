/**
 * @fileoverview Cliente del worker para registrar, inyectar y mensajear el
 * runtime automático del modo `All sites`.
 */
import {
  AUTO_BOOSTER_CONTENT_SCRIPT_PATH,
  AUTO_BOOSTER_ISOLATED_SCRIPT_ID,
  AUTO_BOOSTER_MAIN_WORLD_SCRIPT_ID,
  AUTO_BOOSTER_MAIN_WORLD_SCRIPT_PATH,
  AUTO_BOOSTER_REGISTERED_MATCHES
} from "../shared/constants";
import { message, type ContentCommand } from "../shared/messages";
import type {
  AutoBoosterConfigPayload,
  AutoBoosterDebugState,
  AutoFrameTarget,
  LocalizedMessage
} from "../shared/types";

/**
 * Encapsula el registro temprano de content scripts y la mensajería dirigida
 * a frames concretos del lane automático.
 */
export class AutoBoosterClient {
  async configure(tabId: number, payload: AutoBoosterConfigPayload, target?: AutoFrameTarget): Promise<void> {
    const command: ContentCommand = {
      type: "AUTO_BOOSTER_CONFIGURE",
      payload
    };

    if (target) {
      await this.sendMessageToFrame(tabId, target, command);
      return;
    }

    await this.injectRegisteredScriptsIntoTab(tabId);
    await this.sendMessageToTab(tabId, command, 2);
  }

  async disable(tabId: number, target?: AutoFrameTarget): Promise<void> {
    const command: ContentCommand = {
      type: "AUTO_BOOSTER_DISABLE",
      payload: { tabId }
    };

    try {
      if (target) {
        await this.sendMessageToFrame(tabId, target, command);
        return;
      }

      await this.sendMessageToTab(tabId, command);
    } catch {
      // Missing receiver or navigated tab is fine during teardown.
    }
  }

  async getDebugState(tabId: number, target?: AutoFrameTarget): Promise<AutoBoosterDebugState | null> {
    try {
      if (target) {
        return (
          (await this.sendMessageToFrame<AutoBoosterDebugState | null>(tabId, target, {
            type: "AUTO_BOOSTER_GET_DEBUG_STATE"
          })) ?? null
        );
      }

      return (
        (await this.sendMessageToTab<AutoBoosterDebugState | null>(tabId, {
          type: "AUTO_BOOSTER_GET_DEBUG_STATE"
        }, 2)) ?? null
      );
    } catch {
      return null;
    }
  }

  async requestGlobalPermission(): Promise<boolean> {
    if (!chrome.permissions?.request) {
      return false;
    }

    try {
      return Boolean(
        await chrome.permissions.request({
          origins: ["<all_urls>"]
        })
      );
    } catch {
      return false;
    }
  }

  async hasGlobalPermission(): Promise<boolean> {
    if (!chrome.permissions?.contains) {
      return false;
    }

    return chrome.permissions.contains({
      origins: ["<all_urls>"]
    });
  }

  async queryInjectableTabs(): Promise<chrome.tabs.Tab[]> {
    try {
      return await chrome.tabs.query({
        url: [...AUTO_BOOSTER_REGISTERED_MATCHES]
      });
    } catch {
      return [];
    }
  }

  async registerGlobalContentScripts(): Promise<void> {
    await unregisterRegisteredScripts();

    if (typeof chrome.scripting?.registerContentScripts !== "function") {
      return;
    }

    await chrome.scripting.registerContentScripts([
      {
        id: AUTO_BOOSTER_ISOLATED_SCRIPT_ID,
        js: [AUTO_BOOSTER_CONTENT_SCRIPT_PATH],
        matches: [...AUTO_BOOSTER_REGISTERED_MATCHES],
        allFrames: true,
        matchOriginAsFallback: true,
        persistAcrossSessions: true,
        runAt: "document_start",
        world: "ISOLATED"
      },
      {
        id: AUTO_BOOSTER_MAIN_WORLD_SCRIPT_ID,
        js: [AUTO_BOOSTER_MAIN_WORLD_SCRIPT_PATH],
        matches: [...AUTO_BOOSTER_REGISTERED_MATCHES],
        allFrames: true,
        matchOriginAsFallback: true,
        persistAcrossSessions: true,
        runAt: "document_start",
        world: "MAIN"
      }
    ]);
  }

  async unregisterGlobalContentScripts(): Promise<void> {
    await unregisterRegisteredScripts();
  }

  async injectRegisteredScriptsIntoTab(tabId: number): Promise<void> {
    try {
      await this.injectRegisteredScriptsIntoTabWithTarget(tabId, { allFrames: true });
    } catch (error) {
      // Top-frame fallback avoids failing all sites on cross-origin frame injection errors.
      try {
        await this.injectRegisteredScriptsIntoTabWithTarget(tabId, { allFrames: false });
      } catch (fallbackError) {
        throw normalizeContentScriptError(fallbackError);
      }
    }
  }

  private async injectRegisteredScriptsIntoTabWithTarget(
    tabId: number,
    target: { allFrames: boolean }
  ): Promise<void> {
    await Promise.all([
      chrome.scripting.executeScript({
        target: { tabId, ...target },
        files: [AUTO_BOOSTER_CONTENT_SCRIPT_PATH]
      }),
      chrome.scripting.executeScript({
        target: { tabId, ...target },
        files: [AUTO_BOOSTER_MAIN_WORLD_SCRIPT_PATH],
        world: "MAIN"
      })
    ]);
  }

  async sendMessageToFrame<T = void>(
    tabId: number,
    target: AutoFrameTarget,
    command: ContentCommand
  ): Promise<T | undefined> {
    try {
      return (await chrome.tabs.sendMessage(tabId, command, {
        frameId: target.frameId,
        ...(target.documentId ? { documentId: target.documentId } : {})
      })) as T | undefined;
    } catch (error) {
      throw normalizeContentScriptError(error);
    }
  }

  private async sendMessageToTab<T = void>(
    tabId: number,
    command: ContentCommand,
    attempts = 1
  ): Promise<T | undefined> {
    return this.sendMessageToTabWithAttempts(tabId, command, attempts);
  }

  private async sendMessageToTabWithAttempts<T = void>(
    tabId: number,
    command: ContentCommand,
    attempts: number
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

        await this.injectRegisteredScriptsIntoTab(tabId);
        await delay(50);
      }
    }

    throw normalizeContentScriptError(lastError);
  }
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

function isMissingReceiverError(error: unknown): boolean {
  return error instanceof Error && /Receiving end does not exist/i.test(error.message);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function unregisterRegisteredScripts(): Promise<void> {
  if (typeof chrome.scripting?.unregisterContentScripts !== "function") {
    return;
  }

  try {
    await chrome.scripting.unregisterContentScripts({
      ids: [AUTO_BOOSTER_ISOLATED_SCRIPT_ID, AUTO_BOOSTER_MAIN_WORLD_SCRIPT_ID]
    });
  } catch {
    // Registered scripts may not exist yet; cleanup is best-effort.
  }
}
