import { DEFAULT_GAIN_PERCENT } from "./constants";
import type { TabSummary } from "./types";

const CAPTURABLE_PROTOCOLS = new Set(["http:", "https:"]);

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

export function isSupportedTabUrl(url?: string | null): boolean {
  return Boolean(getDomainFromUrl(url));
}

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
