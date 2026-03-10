import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../default-advanced-audio-settings";
import { applyQualityPreset } from "../apply-quality-preset";
import { isPresetSettingsMatch } from "./is-preset-settings-match";
import { maybePromotePreset } from "./maybe-promote-preset";

describe("audio-settings/internal preset matching", () => {
  it("promotes exact named presets back from matching settings", () => {
    expect(maybePromotePreset(applyQualityPreset("maximum_clarity")).qualityPreset).toBe(
      "maximum_clarity"
    );
    expect(maybePromotePreset(applyQualityPreset("bass_boost")).qualityPreset).toBe("bass_boost");
    expect(isPresetSettingsMatch("balanced", applyQualityPreset("balanced"))).toBe(true);
    expect(isPresetSettingsMatch("balanced", applyQualityPreset("maximum_clarity"))).toBe(false);
  });

  it.each([
    [
      "vocal_presence",
      {
        qualityPreset: "vocal_presence",
        qualityProtectorMode: "balanced",
        ceilingDb: -1.1,
        lookaheadMs: 5.4,
        releaseMs: 185,
        multibandDepth: 39,
        softClipMix: 10
      }
    ],
    [
      "smooth_bright",
      {
        qualityPreset: "smooth_bright",
        qualityProtectorMode: "balanced",
        ceilingDb: -1.25,
        lookaheadMs: 6.8,
        releaseMs: 210,
        multibandDepth: 33,
        softClipMix: 7
      }
    ],
    [
      "warm_cinematic",
      {
        qualityPreset: "warm_cinematic",
        qualityProtectorMode: "balanced",
        ceilingDb: -1.15,
        lookaheadMs: 6.6,
        releaseMs: 245,
        multibandDepth: 42,
        softClipMix: 11
      }
    ],
    [
      "punch_drive",
      {
        qualityPreset: "punch_drive",
        qualityProtectorMode: "balanced",
        ceilingDb: -0.95,
        lookaheadMs: 3.6,
        releaseMs: 145,
        multibandDepth: 49,
        softClipMix: 16
      }
    ]
  ] as const)("promotes the exact %s preset snapshot", (preset, expected) => {
    expect(maybePromotePreset(expected).qualityPreset).toBe(preset);
  });

  it("keeps a non-matching manual configuration as custom", () => {
    const custom = maybePromotePreset({
      ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
      qualityPreset: "custom",
      releaseMs: 211
    });

    expect(custom.qualityPreset).toBe("custom");
  });

  it("requires every preset field to match before a preset is considered identical", () => {
    const balanced = applyQualityPreset("balanced");
    const mismatches = [
      { ...balanced, ceilingDb: -1.1 },
      { ...balanced, lookaheadMs: 5.5 },
      { ...balanced, releaseMs: 161 },
      { ...balanced, multibandDepth: 46 },
      { ...balanced, softClipMix: 15.1 }
    ];

    for (const mismatch of mismatches) {
      expect(isPresetSettingsMatch("balanced", mismatch)).toBe(false);
      expect(maybePromotePreset({ ...mismatch, qualityPreset: "custom" }).qualityPreset).toBe("custom");
    }
  });
});
