import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../shared/audio-settings";
import { getVisibleBoostSettingsBundle } from "./get-visible-boost-settings-bundle";

describe("getVisibleBoostSettingsBundle", () => {
  it("prefers draft advanced settings, then pending settings, then the worker bundle", () => {
    const viewModel = {
      advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS, qualityPreset: "smooth_bright" },
      boostSettingsBundle: {
        gainPercent: 140,
        advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS, qualityPreset: "warm_cinematic" }
      }
    };

    expect(
      getVisibleBoostSettingsBundle(
        viewModel as never,
        220,
        { ...DEFAULT_ADVANCED_AUDIO_SETTINGS, qualityPreset: "maximum_loudness" },
        { ...DEFAULT_ADVANCED_AUDIO_SETTINGS, qualityPreset: "bass_boost" }
      )
    ).toEqual({
      gainPercent: 220,
      advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS, qualityPreset: "maximum_loudness" }
    });

    expect(
      getVisibleBoostSettingsBundle(
        viewModel as never,
        220,
        null,
        { ...DEFAULT_ADVANCED_AUDIO_SETTINGS, qualityPreset: "bass_boost" }
      )
    ).toEqual({
      gainPercent: 220,
      advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS, qualityPreset: "bass_boost" }
    });

    expect(getVisibleBoostSettingsBundle(viewModel as never, 220, null, null)).toEqual({
      gainPercent: 220,
      advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS, qualityPreset: "warm_cinematic" }
    });
  });
});
