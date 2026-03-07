/**
 * @fileoverview Cliente del worker para inyectar, configurar y consultar el
 * content script automático del modo `All sites`.
 */
import {
  AUTO_BOOSTER_CONTENT_SCRIPT_PATH,
  AUTO_BOOSTER_ISOLATED_SCRIPT_ID,
  AUTO_BOOSTER_MAIN_WORLD_SCRIPT_ID
} from "../shared/constants";
import { message, type ContentCommand } from "../shared/messages";
import type { AutoBoosterConfigPayload, AutoBoosterDebugState, LocalizedMessage } from "../shared/types";

/**
 * Encapsula la inyección del content script automático y la mensajería con la
 * pestaña objetivo.
 */
export class AutoBoosterClient {
  /**
   * Inyecta y configura el auto-booster en una pestaña concreta.
   */
  async configure(tabId: number, payload: AutoBoosterConfigPayload): Promise<void> {
    await this.ensureInjected(tabId);
    await this.sendMessageToTab(tabId, {
      type: "AUTO_BOOSTER_CONFIGURE",
      payload
    });
  }

  /**
   * Desactiva el auto-booster en una pestaña concreta.
   */
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

  /**
   * Pide el estado de depuración del auto-booster a una pestaña concreta.
   */
  async getDebugState(tabId: number): Promise<AutoBoosterDebugState | null> {
    try {
      await this.ensureInjected(tabId);
      await this.ensureReceiverReady(tabId);
    } catch {
      return null;
    }

    return (
      (await this.sendMessageToTab<AutoBoosterDebugState | null>(tabId, {
        type: "AUTO_BOOSTER_GET_DEBUG_STATE"
      })) ?? null
    );
  }

  /**
   * Solicita el permiso global de host necesario para el modo `All sites`.
   */
  async requestGlobalPermission(): Promise<boolean> {
    return chrome.permissions.request({
      origins: ["<all_urls>"]
    });
  }

  /**
   * Comprueba si el permiso global de host ya fue concedido.
   */
  async hasGlobalPermission(): Promise<boolean> {
    return chrome.permissions.contains({
      origins: ["<all_urls>"]
    });
  }

  /**
   * Devuelve las pestañas potencialmente inyectables para el modo global.
   */
  async queryInjectableTabs(): Promise<chrome.tabs.Tab[]> {
    return chrome.tabs.query({
      url: ["http://*/*", "https://*/*"]
    });
  }

  /**
   * Limpia scripts registrados de implementaciones automáticas anteriores.
   */
  async registerGlobalContentScripts(): Promise<void> {
    await unregisterLegacyRegisteredScripts();
  }

  async unregisterGlobalContentScripts(): Promise<void> {
    await unregisterLegacyRegisteredScripts();
  }

  /**
   * Inyecta el módulo del content script automático en la pestaña destino.
   */
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

  /**
   * Espera a que el receptor del content script esté listo para recibir
   * mensajes.
   */
  private async ensureReceiverReady(tabId: number, attempts = 100): Promise<void> {
    let lastError: unknown = new Error("Content receiver did not acknowledge readiness.");

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const response = await chrome.tabs.sendMessage(tabId, {
          type: "AUTO_BOOSTER_PING"
        });

        if ((response as { ready?: boolean } | undefined)?.ready) {
          return;
        }

        lastError = new Error("Content receiver did not acknowledge readiness.");
      } catch (error) {
        lastError = error;

        if (!isMissingReceiverError(error)) {
          break;
        }
      }

      if (attempt === attempts - 1) {
        break;
      }

      if ((attempt + 1) % 10 === 0) {
        await this.ensureInjected(tabId);
      }

      await delay(50);
    }

    throw normalizeContentScriptError(lastError);
  }

  /**
   * Envía un comando al content script con un único reintento de inyección si
   * el receiver todavía no existe.
   */
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

/**
 * Detecta el error típico de `Receiving end does not exist`.
 */
function isMissingReceiverError(error: unknown): boolean {
  return error instanceof Error && /Receiving end does not exist/i.test(error.message);
}

/**
 * Normaliza errores de scripting/mensajería a mensajes localizados de
 * producto.
 */
function normalizeContentScriptError(error: unknown): LocalizedMessage {
  if (
    error instanceof Error &&
    /Cannot access contents of the page|The extensions gallery cannot be scripted/i.test(error.message)
  ) {
    return message("errorAutoPermissionMissing");
  }

  return message("errorAutoAttachFailed");
}

/**
 * Espera el número de milisegundos indicado.
 */
function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

/**
 * Elimina scripts registrados legados de lanes automáticos experimentales.
 */
async function unregisterLegacyRegisteredScripts(): Promise<void> {
  if (typeof chrome.scripting?.unregisterContentScripts !== "function") {
    return;
  }

  try {
    await chrome.scripting.unregisterContentScripts({
      ids: [AUTO_BOOSTER_ISOLATED_SCRIPT_ID, AUTO_BOOSTER_MAIN_WORLD_SCRIPT_ID]
    });
  } catch {
    // Legacy registered scripts may not exist; cleanup is best-effort.
  }
}

/**
 * Inyecta dinámicamente el módulo del auto-booster dentro del tab.
 */
async function injectAutoBoosterModule(moduleUrl: string): Promise<void> {
  const runtimeWindow = window as Window & {
    __PRISM_AUTO_BOOSTER_IMPORT_PROMISE__?: Promise<unknown>;
  };

  runtimeWindow.__PRISM_AUTO_BOOSTER_IMPORT_PROMISE__ ??= import(moduleUrl);
  await runtimeWindow.__PRISM_AUTO_BOOSTER_IMPORT_PROMISE__;
}
