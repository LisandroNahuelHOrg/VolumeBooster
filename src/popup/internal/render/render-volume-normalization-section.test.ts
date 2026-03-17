import { expect, test } from "vitest";
import { loadLocaleCatalog } from "../../../shared/runtime-i18n";
import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../../../shared/audio-settings";
import { renderVolumeNormalizationSection } from "./render-volume-normalization-section";

test("renders the volume normalization card with modes, target slider, meter, and live stats", async () => {
  const catalog = await loadLocaleCatalog("en");
  const markup = renderVolumeNormalizationSection({
    catalog,
    advancedAudioSettings: {
      ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
      volumeNormalizationMode: "speech",
      volumeNormalizationTargetPercent: 108
    },
    controlsLocked: false,
    volumeNormalizationLocked: false,
    volumeNormalizationModeLabel: "Speech",
    volumeNormalizationSubtitle: "Boost quiet voices and steady uneven streams.",
    normalizationCorrection: "+3.2 dB",
    normalizationAction: "Raising",
    normalizationLoad: "27%",
    normalizationOffsetScore: "-42",
    normalizationOffsetPositionPercent: 29
  });

  expect(markup).toContain('data-role="volume-normalization"');
  expect(markup).toContain('data-volume-normalization="off"');
  expect(markup).toContain('data-volume-normalization="balanced"');
  expect(markup).toContain('data-volume-normalization="speech"');
  expect(markup).toContain('data-volume-normalization="aggressive"');
  expect(markup).toContain('data-role="normalization-slider"');
  expect(markup).toContain('data-role="normalization-target-value">108%<');
  expect(markup).toContain('data-role="normalization-offset-value">-42<');
  expect(markup).toContain('data-role="normalization-correction-value">+3.2 dB<');
  expect(markup).toContain('data-role="normalization-action-value">Raising<');
  expect(markup).toContain('data-role="normalization-load-value">27%<');
  expect(markup).toContain('data-role="normalization-offset-thumb"');
  expect(markup).toContain("left:29%");
});
