import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../../../shared/audio-settings";
import type { SessionBoostState } from "../../../shared/boost-settings";
import type { ExtensionSettings } from "../../../shared/types";
import { resolveEffectiveBoostSettingsBundle } from "./resolve-effective-boost-settings-bundle";

describe("resolveEffectiveBoostSettingsBundle", () => {
  const settings: ExtensionSettings = {
    domainGains: { "saved.example": 230 },
    domainAudioSettings: {
      "saved.example": { ...DEFAULT_ADVANCED_AUDIO_SETTINGS, qualityProtectorMode: "warmth" }
    },
    audioSettings: {
      global: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS, qualityPreset: "punch_drive" }
    },
    autoBoosterMode: "off",
    globalAutoGainPercent: 180,
    popupTheme: "dark"
  };

  it("prefers a site session override before the global draft and persisted values", () => {
    const sessionBoostState: SessionBoostState = {
      globalDraftBundle: {
        gainPercent: 260,
        advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS, qualityPreset: "bass_boost" }
      },
      siteSessionBundles: {
        "saved.example": {
          gainPercent: 140,
          advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS, qualityPreset: "maximum_clarity" }
        }
      },
      promptDismissed: false
    };

    expect(resolveEffectiveBoostSettingsBundle(settings, sessionBoostState, "saved.example")).toEqual({
      gainPercent: 140,
      advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS, qualityPreset: "maximum_clarity" }
    });
  });

  it("falls back from the global draft to persisted site and then persisted global settings", () => {
    expect(
      resolveEffectiveBoostSettingsBundle(
        settings,
        {
          globalDraftBundle: {
            gainPercent: 260,
            advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS, qualityPreset: "bass_boost" }
          },
          siteSessionBundles: {},
          promptDismissed: false
        },
        "fresh.example"
      )
    ).toEqual({
      gainPercent: 260,
      advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS, qualityPreset: "bass_boost" }
    });

    expect(
      resolveEffectiveBoostSettingsBundle(
        settings,
        { globalDraftBundle: null, siteSessionBundles: {}, promptDismissed: false },
        "saved.example"
      )
    ).toEqual({
      gainPercent: 230,
      advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS, qualityProtectorMode: "warmth" }
    });

    expect(
      resolveEffectiveBoostSettingsBundle(
        settings,
        { globalDraftBundle: null, siteSessionBundles: {}, promptDismissed: false },
        "fresh.example"
      )
    ).toEqual({
      gainPercent: 180,
      advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS, qualityPreset: "punch_drive" }
    });
  });
});
