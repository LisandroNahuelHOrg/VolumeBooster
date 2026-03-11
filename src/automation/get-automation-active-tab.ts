/**
 * @fileoverview Reads the active browser tab with a deterministic fallback.
 * @module automation/get-automation-active-tab
 */

import type { AutomationTabSummary } from "./automation-bridge-types";

/**
 * Recupera la pestaña activa del navegador con un fallback entre la ventana
 * enfocada y la ventana actual.
 */
export async function getAutomationActiveTab(): Promise<AutomationTabSummary | null> {
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
