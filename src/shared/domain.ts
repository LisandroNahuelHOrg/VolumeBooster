/**
 * @fileoverview Domain and tab-summary helpers shared by popup and worker code.
 * @module shared/domain
 */

import { DEFAULT_GAIN_PERCENT } from "./constants";
import type { TabSummary } from "./types";

const CAPTURABLE_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Extracts a normalized domain from a tab URL if the URL can be captured by
 * the extension.
 *
 * @param url - Candidate tab URL.
 * @returns Normalized hostname without `www.`, or `undefined` when the URL is
 * not capturable or cannot be parsed.
 */
export function getDomainFromUrl(url?: string | null): string | undefined {
  if (!url) {
    return undefined;
  }

  try {
    const parsedUrl = new URL(url);

    if (!CAPTURABLE_PROTOCOLS.has(parsedUrl.protocol)) {
      return undefined;
    }

    return parsedUrl.hostname.replace(/^www\./i, "").toLowerCase() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Indicates whether a tab URL belongs to a supported capturable protocol.
 *
 * @param url - Candidate tab URL.
 * @returns `true` when the URL can be processed by the booster.
 */
export function isSupportedTabUrl(url?: string | null): boolean {
  return Boolean(getDomainFromUrl(url));
}

/**
 * Builds a DuckDuckGo favicon endpoint for a normalized domain.
 *
 * @param domain - Site domain to resolve.
 * @returns Fully qualified favicon URL, or `undefined` when the input is empty.
 */
export function getDuckDuckGoFaviconUrl(domain?: string | null): string | undefined {
  if (!domain) {
    return undefined;
  }

  const normalizedDomain = domain.trim().replace(/^www\./i, "").toLowerCase();

  if (!normalizedDomain) {
    return undefined;
  }

  return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(normalizedDomain)}.ico`;
}

/**
 * Creates the lightweight tab model used by worker state and popup rendering.
 *
 * @param tab - Chrome tab to summarize.
 * @param preferredGainPercent - Gain value that should be suggested for the tab.
 * @param hasStoredPreference - Whether the suggested gain comes from persisted settings.
 * @returns Normalized tab summary suitable for UI state.
 */
export function buildTabSummary(
  tab: chrome.tabs.Tab,
  preferredGainPercent = DEFAULT_GAIN_PERCENT,
  hasStoredPreference = false
): TabSummary {
  return {
    tabId: tab.id ?? -1,
    title: tab.title || tab.pendingUrl || tab.url || "",
    url: tab.url,
    domain: getDomainFromUrl(tab.url),
    favIconUrl: tab.favIconUrl,
    supported: isSupportedTabUrl(tab.url),
    preferredGainPercent,
    hasStoredPreference,
    autoAttachState: "idle"
  };
}
