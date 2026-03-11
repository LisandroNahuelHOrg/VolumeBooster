import type { SessionBoostState } from "../boost-settings-bundle";

export function createDefaultSessionBoostState(): SessionBoostState {
  return {
    globalDraftBundle: null,
    siteSessionBundles: {},
    promptDismissed: false
  };
}
