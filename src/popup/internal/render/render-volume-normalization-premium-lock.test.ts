import { expect, test } from "vitest";
import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../../../shared/audio-settings";
import { loadLocaleCatalog } from "../../../shared/runtime-i18n";
import { renderVolumeNormalizationSection } from "./render-volume-normalization-section";

test("renders normalization as a genuinely locked premium card for freemium users", async () => {
  const catalog = await loadLocaleCatalog("en");
  const markup = renderVolumeNormalizationSection({
    catalog,
    advancedAudioSettings: {
      ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
      volumeNormalizationMode: "balanced",
      volumeNormalizationTargetPercent: 108
    },
    controlsLocked: false,
    volumeNormalizationLocked: true,
    volumeNormalizationModeLabel: "Balanced",
    volumeNormalizationSubtitle: "Keep playback steady without overreacting to normal dynamics.",
    normalizationCorrection: "+0.0 dB",
    normalizationAction: "Holding",
    normalizationLoad: "0%",
    normalizationOffsetScore: "0",
    normalizationOffsetPositionPercent: 50
  });

  expect(markup).toContain('data-premium-locked="true"');
  expect(markup).toContain('data-role="premium-lock-banner"');
  expect(markup).toContain('data-action="open-popup-premium"');
  expect(markup).toContain('data-volume-normalization="balanced" type="button" disabled');
  expect(markup).toContain('data-role="normalization-slider"');
  expect(markup).toContain("disabled");
});
