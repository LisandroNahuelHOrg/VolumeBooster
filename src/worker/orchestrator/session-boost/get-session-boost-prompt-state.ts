import type { SessionBoostPromptState, SessionBoostState } from "../../../shared/boost-settings";

export function getSessionBoostPromptState(sessionBoostState: SessionBoostState): SessionBoostPromptState {
  return {
    hasUnsavedChanges:
      sessionBoostState.globalDraftBundle !== null || Object.keys(sessionBoostState.siteSessionBundles).length > 0,
    dismissed: sessionBoostState.promptDismissed
  };
}
