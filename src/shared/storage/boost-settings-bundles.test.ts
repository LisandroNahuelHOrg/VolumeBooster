import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../audio-settings";
import { SettingsRepository } from "../storage";
import { createStorageArea } from "./tests/create-storage-area";

describe("SettingsRepository boost settings bundles", () => {
  it("round-trips a site bundle including per-domain advanced audio settings", async () => {
    const repository = new SettingsRepository(createStorageArea());
    const bundle = {
      gainPercent: 260,
      advancedAudioSettings: {
        ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
        qualityPreset: "maximum_loudness" as const,
        qualityProtectorMode: "warmth" as const
      }
    };

    await repository.setDomainBoostSettingsBundle("youtube.com", bundle);

    await expect(repository.getDomainBoostSettingsBundle("youtube.com")).resolves.toEqual(bundle);
    await expect(repository.getSettings()).resolves.toMatchObject({
      domainGains: { "youtube.com": 260 },
      domainAudioSettings: {
        "youtube.com": {
          ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
          qualityPreset: "maximum_loudness",
          qualityProtectorMode: "warmth"
        }
      }
    });
  });

  it("persists the global bundle and clears all site overrides together", async () => {
    const repository = new SettingsRepository(createStorageArea());

    await repository.setDomainBoostSettingsBundle("youtube.com", {
      gainPercent: 180,
      advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS, qualityPreset: "bass_boost" as const }
    });
    await repository.setGlobalBoostSettingsBundle({
      gainPercent: 320,
      advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS, qualityPreset: "punch_drive" as const }
    });
    await repository.clearDomainBoostSettingsBundles();

    await expect(repository.getGlobalBoostSettingsBundle()).resolves.toEqual({
      gainPercent: 320,
      advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS, qualityPreset: "punch_drive" }
    });
    await expect(repository.getSettings()).resolves.toMatchObject({
      domainGains: {},
      domainAudioSettings: {}
    });
  });
});
