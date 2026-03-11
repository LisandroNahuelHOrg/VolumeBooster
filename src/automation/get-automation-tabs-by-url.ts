/**
 * @fileoverview Queries tabs whose URL matches a given pattern.
 * @module automation/get-automation-tabs-by-url
 */

import type { AutomationTabSummary } from "./automation-bridge-types";

/**
 * Devuelve las pestañas cuyo patrón de URL coincide con el indicado para
 * escenarios automáticos de verificación.
 */
export async function getAutomationTabsByUrl(
  urlPattern: string
): Promise<AutomationTabSummary[]> {
  const tabs = await chrome.tabs.query({ url: urlPattern });
  return tabs
    .filter((tab): tab is chrome.tabs.Tab & { id: number } => typeof tab.id === "number")
    .map((tab) => ({
      id: tab.id,
      url: tab.url,
      title: tab.title
    }));
}
