import { sendMessageSafe } from "../shared/messages";
import type { PopupCommand } from "../shared/messages";
import type { AutoBoosterDebugState, WorkerState } from "../shared/types";

declare global {
  interface Window {
    __PRISM_AUTOMATION__?: {
      requestGlobalPermission(): Promise<WorkerState | null>;
      hasGlobalPermission(): Promise<boolean>;
    sendCommand<T = unknown>(command: PopupCommand): Promise<T | null>;
    getState(): Promise<WorkerState | null>;
    getDebugState(tabId: number): Promise<AutoBoosterDebugState | null>;
    getActiveTab(): Promise<{ id: number; url?: string; title?: string } | null>;
    getTabsByUrl(urlPattern: string): Promise<Array<{ id: number; url?: string; title?: string }>>;
  };
}
}

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("Automation root not found.");
}

document.title = "Prism Automation";
root.innerHTML = `
  <main style="font-family: 'Segoe UI', sans-serif; padding: 20px; color: #f4f6f8; background: #0f1720; min-height: 100vh;">
    <h1 style="margin: 0 0 12px; font-size: 20px;">Prism Automation Bridge</h1>
    <p style="margin: 0 0 16px; line-height: 1.5; color: #c6d3dd;">
      Internal page used by the Playwright harness to request permissions and send extension commands.
    </p>
    <button
      type="button"
      data-action="request-global-permission"
      style="padding: 12px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); background: #1d6bff; color: white; font-weight: 700; cursor: pointer;"
    >
      Grant all-sites permission
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
  getState,
  getDebugState,
  getActiveTab,
  getTabsByUrl
};

async function requestGlobalPermission(): Promise<WorkerState | null> {
  const response = await sendMessageSafe<WorkerState>({ type: "REQUEST_GLOBAL_PERMISSION" });
  return response.ok ? response.data ?? null : null;
}

async function hasGlobalPermission(): Promise<boolean> {
  return chrome.permissions.contains({ origins: ["<all_urls>"] });
}

async function sendCommand<T = unknown>(command: PopupCommand): Promise<T | null> {
  const response = await sendMessageSafe<T>(command);
  return response.ok ? response.data ?? null : null;
}

async function getState(): Promise<WorkerState | null> {
  return sendCommand<WorkerState>({ type: "GET_STATE" });
}

async function getDebugState(tabId: number): Promise<AutoBoosterDebugState | null> {
  return sendCommand<AutoBoosterDebugState | null>({
    type: "GET_DEBUG_STATE",
    payload: { tabId }
  });
}

async function getTabsByUrl(urlPattern: string): Promise<Array<{ id: number; url?: string; title?: string }>> {
  const tabs = await chrome.tabs.query({ url: urlPattern });
  return tabs.filter((tab): tab is chrome.tabs.Tab & { id: number } => typeof tab.id === "number").map((tab) => ({
    id: tab.id,
    url: tab.url,
    title: tab.title
  }));
}

async function getActiveTab(): Promise<{ id: number; url?: string; title?: string } | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || typeof tab.id !== "number") {
    return null;
  }

  return {
    id: tab.id,
    url: tab.url,
    title: tab.title
  };
}
