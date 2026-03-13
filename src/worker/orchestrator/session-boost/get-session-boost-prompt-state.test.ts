import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../../../shared/audio-settings";
import { getSessionBoostPromptState } from "./get-session-boost-prompt-state";

describe("getSessionBoostPromptState", () => {
  it("marks the prompt as unsaved when there is a global draft or a site override", () => {
    expect(
      getSessionBoostPromptState({
        globalDraftBundle: {
          gainPercent: 200,
          advancedAudioSettings: {
            ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
            ceilingDb: -0.8,
            lookaheadMs: 3,
            releaseMs: 140,
            multibandDepth: 40,
            softClipMix: 12
          }
        },
        siteSessionBundles: {},
        promptDismissed: false
      })
    ).toEqual({ hasUnsavedChanges: true, dismissed: false });

    expect(
      getSessionBoostPromptState({
        globalDraftBundle: null,
        siteSessionBundles: {
          "example.com": {
            gainPercent: 100,
            advancedAudioSettings: {
              ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
              qualityProtectorMode: "off",
              ceilingDb: -1,
              lookaheadMs: 2,
              releaseMs: 120,
              multibandDepth: 0,
              softClipMix: 0
            }
          }
        },
        promptDismissed: true
      })
    ).toEqual({ hasUnsavedChanges: true, dismissed: true });
  });

  it("reports a clean prompt when session state is empty", () => {
    expect(
      getSessionBoostPromptState({
        globalDraftBundle: null,
        siteSessionBundles: {},
        promptDismissed: false
      })
    ).toEqual({ hasUnsavedChanges: false, dismissed: false });
  });
});
