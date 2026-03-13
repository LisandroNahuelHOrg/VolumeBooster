import { expect, test } from "vitest";
import {
  DEFAULT_ADVANCED_AUDIO_SETTINGS,
  buildDspRuntimeParameters,
  createDefaultMetrics,
  deriveNormalizationMetrics
} from "../audio-settings";

test("derives normalization telemetry across disabled, raising, lowering, and capped scenarios", () => {
  const baseMetrics = createDefaultMetrics();
  const offRuntime = buildDspRuntimeParameters(100, DEFAULT_ADVANCED_AUDIO_SETTINGS);
  const balancedRuntime = buildDspRuntimeParameters(100, {
    ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
    volumeNormalizationMode: "balanced"
  });
  const aggressiveRuntime = buildDspRuntimeParameters(100, {
    ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
    volumeNormalizationMode: "aggressive",
    volumeNormalizationTargetPercent: 120
  });

  expect(deriveNormalizationMetrics(offRuntime, -24, baseMetrics)).toEqual({
    normalizationInputLoudnessDb: -24,
    normalizationAppliedGainDb: 0,
    normalizationOffsetScore: 0,
    normalizationAction: "holding",
    normalizationLoadPercent: 0
  });

  const raising = deriveNormalizationMetrics(balancedRuntime, -28, baseMetrics);
  expect(raising.normalizationAction).toBe("raising");
  expect(raising.normalizationAppliedGainDb).toBeGreaterThan(0);
  expect(raising.normalizationOffsetScore).toBeLessThan(0);

  const lowering = deriveNormalizationMetrics(balancedRuntime, -15, baseMetrics);
  expect(lowering.normalizationAction).toBe("lowering");
  expect(lowering.normalizationAppliedGainDb).toBeLessThan(0);
  expect(lowering.normalizationOffsetScore).toBeGreaterThan(0);

  const capped = deriveNormalizationMetrics(aggressiveRuntime, -50, baseMetrics);
  expect(capped.normalizationAction).toBe("capped");
  expect(capped.normalizationAppliedGainDb).toBeGreaterThan(0);
  expect(capped.normalizationOffsetScore).toBe(-100);
  expect(capped.normalizationLoadPercent).toBeGreaterThan(0);
});
