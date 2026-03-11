import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../audio-settings";
import { SessionBoostRepository } from "../session-boost";
import { createStorageArea } from "../storage/tests/create-storage-area";

describe("SessionBoostRepository", () => {
  it("returns a clean default state from empty storage", async () => {
    const repository = new SessionBoostRepository(createStorageArea());

    await expect(repository.getState()).resolves.toEqual({
      globalDraftBundle: null,
      siteSessionBundles: {},
      promptDismissed: false
    });
  });

  it("sanitizes and persists draft bundles through the session store", async () => {
    const repository = new SessionBoostRepository(createStorageArea());

    await repository.setState({
      globalDraftBundle: {
        gainPercent: 240,
        advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS, qualityPreset: "warm_cinematic" }
      },
      siteSessionBundles: {
        "youtube.com": {
          gainPercent: 120,
          advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS, qualityProtectorMode: "off" }
        }
      },
      promptDismissed: true
    });

    await expect(repository.getState()).resolves.toEqual({
      globalDraftBundle: {
        gainPercent: 240,
        advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS, qualityPreset: "warm_cinematic" }
      },
      siteSessionBundles: {
        "youtube.com": {
          gainPercent: 120,
          advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS, qualityProtectorMode: "off" }
        }
      },
      promptDismissed: true
    });
  });
});
