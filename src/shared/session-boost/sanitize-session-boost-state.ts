import { sanitizeBoostSettingsBundle } from "../boost-settings";
import type { SessionBoostState } from "../boost-settings-bundle";
import { createDefaultSessionBoostState } from "./create-default-session-boost-state";

export function sanitizeSessionBoostState(rawState: unknown): SessionBoostState {
  if (!rawState || typeof rawState !== "object") {
    return createDefaultSessionBoostState();
  }

  const candidate = rawState as Partial<SessionBoostState>;
  const siteSessionBundles: SessionBoostState["siteSessionBundles"] = {};

  if (candidate.siteSessionBundles && typeof candidate.siteSessionBundles === "object") {
    for (const [domain, bundle] of Object.entries(candidate.siteSessionBundles)) {
      siteSessionBundles[domain] = sanitizeBoostSettingsBundle(bundle);
    }
  }

  return {
    globalDraftBundle: candidate.globalDraftBundle ? sanitizeBoostSettingsBundle(candidate.globalDraftBundle) : null,
    siteSessionBundles,
    promptDismissed: candidate.promptDismissed === true
  };
}
