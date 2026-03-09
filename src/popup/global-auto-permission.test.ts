import type { WorkerState } from "../shared/types";
import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../shared/audio-settings";
import { getRecoverableGlobalAutoTabId } from "./global-auto-permission";

function makeState(overrides: Partial<WorkerState> = {}): WorkerState {
  return {
    currentTab: {
      tabId: 7,
      title: "YouTube",
      url: "https://youtube.com/watch?v=1",
      domain: "youtube.com",
      supported: true,
      preferredGainPercent: 100,
      hasStoredPreference: false,
      autoAttachState: "idle"
    },
    advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS },
    autoBoosterMode: "off",
    globalAutoGainPercent: 100,
    hasGlobalPermission: true,
    sessions: [],
    generatedAt: 1,
    ...overrides
  };
}

describe("getRecoverableGlobalAutoTabId", () => {
  it("returns the current tab id when all-sites access is available and the tab is supported", () => {
    expect(getRecoverableGlobalAutoTabId(makeState())).toBe(7);
  });

  it("returns null when global access is still unavailable", () => {
    expect(getRecoverableGlobalAutoTabId(makeState({ hasGlobalPermission: false }))).toBeNull();
  });

  it("returns null when the current tab is unsupported or missing", () => {
    expect(
      getRecoverableGlobalAutoTabId(
        makeState({
          currentTab: {
            ...makeState().currentTab!,
            supported: false
          }
        })
      )
    ).toBeNull();
    expect(getRecoverableGlobalAutoTabId(makeState({ currentTab: null }))).toBeNull();
  });
});
