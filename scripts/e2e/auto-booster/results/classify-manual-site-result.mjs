import { hasManualSession } from "./has-manual-session.mjs";

export function classifyManualSiteResult(state, tabId) {
  return hasManualSession(state, tabId) ? "pass_manual" : "product_bug";
}
