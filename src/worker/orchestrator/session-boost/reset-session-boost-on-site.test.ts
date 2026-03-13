import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../../../shared/audio-settings";
import { getSessionBoostPromptState } from "./get-session-boost-prompt-state";
import { createTestRuntime } from "../test-harness";
import { resetSessionBoostOnSite } from "./reset-session-boost-on-site";

test("clears both the synced global draft and the site draft so reset on one site no longer counts as an unsaved prompt", async () => {
  const { runtime, sessionBoostRepository, storage } = createTestRuntime();

  vi.stubGlobal("chrome", {
    action: {
      setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
      setBadgeText: vi.fn().mockResolvedValue(undefined),
      setBadgeTextColor: vi.fn().mockResolvedValue(undefined)
    },
    runtime: { sendMessage: vi.fn().mockResolvedValue(undefined) },
    tabs: {
      get: vi.fn().mockResolvedValue({ id: 7, url: "https://youtube.com/watch?v=1" }),
      query: vi.fn().mockResolvedValue([{ id: 7, url: "https://youtube.com/watch?v=1" }])
    }
  } as unknown as typeof chrome);
  await storage.setDomainBoostSettingsBundle("youtube.com", {
    gainPercent: 260,
    advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
  });
  await sessionBoostRepository.setState({
    globalDraftBundle: {
      gainPercent: 260,
      advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
    },
    siteSessionBundles: {
      "youtube.com": {
        gainPercent: 260,
        advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
      }
    },
    promptDismissed: true
  });
  await resetSessionBoostOnSite(runtime, 7);

  await expect(storage.getSettings()).resolves.toMatchObject({
    domainAudioSettings: {},
    domainGains: {}
  });
  await expect(sessionBoostRepository.getState()).resolves.toEqual({
    globalDraftBundle: null,
    siteSessionBundles: {},
    promptDismissed: false
  });
  await expect(sessionBoostRepository.getState()).resolves.toSatisfy((state) =>
    getSessionBoostPromptState(state).hasUnsavedChanges === false
  );
});
