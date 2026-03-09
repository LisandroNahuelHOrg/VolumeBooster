/**
 * @fileoverview Expone un puente interno para la automatización E2E y el
 * diagnóstico del estado del worker desde una página de extensión dedicada.
 */
import { sendMessageSafe } from "../shared/messages";
import type { PopupCommand } from "../shared/messages";
import { setDocumentLocaleAttributes, t } from "../shared/runtime-i18n";
import type { AutoBoosterDebugState, RuntimeResponse, WorkerState } from "../shared/types";

declare global {
  interface Window {
    /**
     * API de automatización consumida por Playwright y otras herramientas de
     * smoke testing para interactuar con la extensión sin usar el popup real.
     */
    __PRISM_AUTOMATION__?: {
      requestGlobalPermission(): Promise<WorkerState | null>;
      hasGlobalPermission(): Promise<boolean>;
      sendCommand<T = unknown>(command: PopupCommand): Promise<T | null>;
      sendCommandDetailed<T = unknown>(command: PopupCommand): Promise<RuntimeResponse<T>>;
      getState(): Promise<WorkerState | null>;
      getStateDetailed(): Promise<RuntimeResponse<WorkerState>>;
      getDebugState(tabId: number): Promise<AutoBoosterDebugState | null>;
      getDebugStateDetailed(tabId: number): Promise<RuntimeResponse<AutoBoosterDebugState | null>>;
      getActiveTab(): Promise<{ id: number; url?: string; title?: string } | null>;
      getTabsByUrl(urlPattern: string): Promise<Array<{ id: number; url?: string; title?: string }>>;
    };
  }
}

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("Automation root not found.");
}

setDocumentLocaleAttributes(document);
document.title = t("automationDocumentTitle");
root.innerHTML = `
  <main style="font-family: 'Segoe UI', sans-serif; padding: 20px; color: #f4f6f8; background: #0f1720; min-height: 100vh;">
    <h1 style="margin: 0 0 12px; font-size: 20px;">${t("automationBridgeTitle")}</h1>
    <p style="margin: 0 0 16px; line-height: 1.5; color: #c6d3dd;">
      ${t("automationBridgeBody")}
    </p>
    <button
      type="button"
      data-action="request-global-permission"
      style="padding: 12px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); background: #1d6bff; color: white; font-weight: 700; cursor: pointer;"
    >
      ${t("automationRestoreAllSitesAccess")}
    </button>
    <pre data-role="output" style="margin-top: 16px; white-space: pre-wrap; background: rgba(255,255,255,0.06); padding: 12px; border-radius: 12px;"></pre>
  </main>
`;

const output = root.querySelector<HTMLElement>("[data-role='output']");
const permissionButton = root.querySelector<HTMLButtonElement>("[data-action='request-global-permission']");

if (permissionButton) {
  permissionButton.addEventListener("click", () => {
    void requestGlobalPermission().then((state) => {
      if (output) {
        output.textContent = JSON.stringify(state, null, 2);
      }
    });
  });
}

window.__PRISM_AUTOMATION__ = {
  requestGlobalPermission,
  hasGlobalPermission,
  sendCommand,
  sendCommandDetailed,
  getState,
  getStateDetailed,
  getDebugState,
  getDebugStateDetailed,
  getActiveTab,
  getTabsByUrl
};

async function requestGlobalPermission(): Promise<WorkerState | null> {
  const response = await sendMessageSafe<WorkerState>({ type: "REQUEST_GLOBAL_PERMISSION" });
  return response.ok ? response.data ?? null : null;
}

/**
 * Comprueba si la extensión ya dispone del permiso global de host para
 * auto-boosting en todos los sitios.
 */
async function hasGlobalPermission(): Promise<boolean> {
  return chrome.permissions.contains({ origins: ["<all_urls>"] });
}

/**
 * Envía un comando del popup al worker y devuelve solo la carga útil en caso
 * de éxito.
 */
async function sendCommand<T = unknown>(command: PopupCommand): Promise<T | null> {
  const response = await sendCommandDetailed<T>(command);
  return response.ok ? response.data ?? null : null;
}

/**
 * Envía un comando del popup al worker y conserva el contrato completo de
 * respuesta para escenarios de diagnóstico.
 */
async function sendCommandDetailed<T = unknown>(command: PopupCommand): Promise<RuntimeResponse<T>> {
  return sendMessageSafe<T>(command);
}

/**
 * Lee el estado visible de la extensión desde el worker.
 */
async function getState(): Promise<WorkerState | null> {
  const response = await getStateDetailed();
  return response.ok ? response.data ?? null : null;
}

/**
 * Lee el estado completo de la extensión incluyendo metadatos de error.
 */
async function getStateDetailed(): Promise<RuntimeResponse<WorkerState>> {
  return sendCommandDetailed<WorkerState>({ type: "GET_STATE" });
}

/**
 * Solicita el estado de depuración del auto-booster para una pestaña
 * específica.
 */
async function getDebugState(tabId: number): Promise<AutoBoosterDebugState | null> {
  const response = await getDebugStateDetailed(tabId);
  return response.ok ? response.data ?? null : null;
}

/**
 * Solicita el estado de depuración completo del auto-booster para una pestaña.
 */
async function getDebugStateDetailed(tabId: number): Promise<RuntimeResponse<AutoBoosterDebugState | null>> {
  return sendCommandDetailed<AutoBoosterDebugState | null>({
    type: "GET_DEBUG_STATE",
    payload: { tabId }
  });
}

/**
 * Devuelve las pestañas cuyo patrón de URL coincide con el indicado para
 * escenarios automáticos de verificación.
 */
async function getTabsByUrl(urlPattern: string): Promise<Array<{ id: number; url?: string; title?: string }>> {
  const tabs = await chrome.tabs.query({ url: urlPattern });
  return tabs.filter((tab): tab is chrome.tabs.Tab & { id: number } => typeof tab.id === "number").map((tab) => ({
    id: tab.id,
    url: tab.url,
    title: tab.title
  }));
}

/**
 * Recupera la pestaña activa del navegador con un fallback entre la ventana
 * enfocada y la ventana actual.
 */
async function getActiveTab(): Promise<{ id: number; url?: string; title?: string } | null> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

  if (tab && typeof tab.id === "number") {
    return {
      id: tab.id,
      url: tab.url,
      title: tab.title
    };
  }

  const [fallbackTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!fallbackTab || typeof fallbackTab.id !== "number") {
    return null;
  }

  return {
    id: fallbackTab.id,
    url: fallbackTab.url,
    title: fallbackTab.title
  };
}
