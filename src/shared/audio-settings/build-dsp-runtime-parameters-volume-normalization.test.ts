import { expect, test } from "vitest";
import {
  DEFAULT_ADVANCED_AUDIO_SETTINGS,
  buildDspRuntimeParameters,
  mapNormalizationTargetPercentToLoudnessDb
} from "../audio-settings";

test("enables runtime normalization and maps the selected target percent for premium normalization settings", () => {
  const runtime = buildDspRuntimeParameters(100, {
    ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
    volumeNormalizationMode: "balanced",
    volumeNormalizationTargetPercent: 118
  });

  expect(runtime.normalization.enabled).toBe(true);
  expect(runtime.normalization.targetLoudnessDb).toBe(
    mapNormalizationTargetPercentToLoudnessDb(118)
  );
  expect(runtime.normalization.maxBoostDb).toBeGreaterThan(0);
  expect(runtime.normalization.maxCutDb).toBeGreaterThan(0);
});
