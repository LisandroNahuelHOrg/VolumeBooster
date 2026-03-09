/**
 * @fileoverview Verifies advanced audio-setting presets, sanitization, and DSP
 * runtime mapping helpers.
 * @module shared/audio-settings.test
 */

import {
  DEFAULT_ADVANCED_AUDIO_SETTINGS,
  applyQualityProtector,
  applyQualityPreset,
  buildDspRuntimeParameters,
  createDefaultMetrics,
  deriveClippingSafetyMarginDb,
  deriveMetricsFromPeaks,
  deriveProtectionLoadPercent,
  deriveWarningFromMetrics,
  getQualityProtectorDefinition,
  isPresetSettingsMatch,
  isProtectionBypassedMode,
  isProtectionBypassedSettings,
  maybePromotePreset,
  sanitizeAdvancedAudioSettings
} from "./audio-settings";

describe("audio-settings", () => {
  it("maps the main boost slider into bounded DSP runtime parameters", () => {
    const runtime = buildDspRuntimeParameters(550, applyQualityPreset("balanced"));

    expect(runtime.boostIntensity).toBe(0.5);
    expect(runtime.extendedBoostIntensity).toBe(0);
    expect(runtime.inputDriveDb).toBe(7);
    expect(runtime.outputCeilingDb).toBe(-1);
    expect(runtime.outputSoftClipMix).toBe(7.5);
  });

  it("preserves the legacy ceiling at 1000% and adds extra drive above it", () => {
    const legacyMax = buildDspRuntimeParameters(1000, applyQualityPreset("maximum_loudness"));
    const extreme = buildDspRuntimeParameters(10000, applyQualityPreset("maximum_loudness"));

    expect(legacyMax.boostIntensity).toBe(1);
    expect(legacyMax.extendedBoostIntensity).toBe(0);
    expect(legacyMax.inputDriveDb).toBe(17);
    expect(extreme.boostIntensity).toBe(1);
    expect(extreme.extendedBoostIntensity).toBe(1);
    expect(extreme.inputDriveDb).toBe(30);
  });

  it("promotes manually edited settings back to a known preset when they match exactly", () => {
    expect(maybePromotePreset(applyQualityPreset("maximum_clarity")).qualityPreset).toBe(
      "maximum_clarity"
    );
  });

  it("exposes a dedicated bass boost preset with audible low-band voicing", () => {
    const bassBoost = buildDspRuntimeParameters(1000, applyQualityPreset("bass_boost"));
    const balanced = buildDspRuntimeParameters(1000, applyQualityPreset("balanced"));

    expect(maybePromotePreset(applyQualityPreset("bass_boost")).qualityPreset).toBe("bass_boost");
    expect(bassBoost.toneLowBandGainDb).toBeGreaterThan(balanced.toneLowBandGainDb);
    expect(bassBoost.toneMidBandGainDb).toBeLessThan(balanced.toneMidBandGainDb);
    expect(bassBoost.inputDriveDb).toBeGreaterThan(0);
  });

  it("keeps a non-matching manual configuration as custom", () => {
    const custom = maybePromotePreset({
      ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
      qualityPreset: "custom",
      releaseMs: 211
    });

    expect(custom.qualityPreset).toBe("custom");
  });

  it("sanitizes advanced settings back into safe numeric ranges", () => {
    const sanitized = sanitizeAdvancedAudioSettings({
      qualityPreset: "custom",
      qualityProtectorMode: "clarity",
      ceilingDb: -10,
      lookaheadMs: 20,
      releaseMs: 999,
      multibandDepth: 500,
      softClipMix: -3
    });

    expect(sanitized).toEqual({
      qualityPreset: "custom",
      qualityProtectorMode: "clarity",
      ceilingDb: -2,
      lookaheadMs: 8,
      releaseMs: 350,
      multibandDepth: 100,
      softClipMix: 0
    });
  });

  it("uses stable defaults when settings are undefined or partially custom", () => {
    expect(sanitizeAdvancedAudioSettings(undefined)).toEqual(DEFAULT_ADVANCED_AUDIO_SETTINGS);

    expect(
      sanitizeAdvancedAudioSettings({
        qualityPreset: "custom"
      })
    ).toEqual({
      ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
      qualityPreset: "custom",
      qualityProtectorMode: "balanced"
    });

    expect(
      sanitizeAdvancedAudioSettings({
        qualityPreset: "custom",
        ceilingDb: 0.1
      }).ceilingDb
    ).toBe(-0.3);
  });

  it("falls back to balanced quality protector mode when the persisted value is invalid", () => {
    const sanitized = sanitizeAdvancedAudioSettings({
      qualityPreset: "balanced",
      qualityProtectorMode: "not-real" as never
    });

    expect(sanitized.qualityProtectorMode).toBe("balanced");
  });

  it("applies explicit bass-aware protector parameters that preserve more low-end than balanced", () => {
    const balanced = applyQualityProtector(
      buildDspRuntimeParameters(5000, applyQualityPreset("maximum_clarity", "balanced"))
    );
    const bassAware = applyQualityProtector(
      buildDspRuntimeParameters(5000, applyQualityPreset("maximum_clarity", "bass_aware"))
    );

    expect(bassAware.protectorEnabled).toBe(true);
    expect(bassAware.outputLimiterEnabled).toBe(true);
    expect(bassAware.lowBandTrimDb).toBeGreaterThan(balanced.lowBandTrimDb);
    expect(bassAware.lowBandMakeupDb).toBeGreaterThan(balanced.lowBandMakeupDb);
    expect(bassAware.lowBandThresholdOffsetDb).toBeGreaterThan(balanced.lowBandThresholdOffsetDb);
    expect(bassAware.lowBandRatioBias).toBeLessThan(balanced.lowBandRatioBias);
    expect(bassAware.midHighThresholdOffsetDb).toBeLessThan(balanced.midHighThresholdOffsetDb);
  });

  it("keeps runtime protection enabled before the protector stage and computes custom drive exactly", () => {
    const extendedBalanced = buildDspRuntimeParameters(5000, applyQualityPreset("balanced"));
    const customSettings = sanitizeAdvancedAudioSettings({
      qualityPreset: "custom",
      qualityProtectorMode: "maximum_protection",
      ceilingDb: -1.5,
      multibandDepth: 88,
      softClipMix: 27
    });
    const customRuntime = buildDspRuntimeParameters(5000, customSettings);

    expect(extendedBalanced.extendedBoostIntensity).toBeCloseTo(4 / 9, 5);
    expect(extendedBalanced.protectorEnabled).toBe(true);
    expect(extendedBalanced.outputLimiterEnabled).toBe(true);
    expect(extendedBalanced.outputSoftClipMix).toBe(23.3);

    expect(customRuntime.toneLowBandGainDb).toBe(0);
    expect(customRuntime.toneMidBandGainDb).toBe(0);
    expect(customRuntime.inputDriveDb).toBe(26.24);
    expect(customRuntime.outputSoftClipMix).toBe(35.3);
  });

  it("applies exact protector output shaping for protected modes", () => {
    const balanced = applyQualityProtector(
      buildDspRuntimeParameters(1000, applyQualityPreset("maximum_clarity", "balanced"))
    );
    const maximumProtection = applyQualityProtector(
      buildDspRuntimeParameters(1000, applyQualityPreset("balanced", "maximum_protection"))
    );

    expect(balanced.outputCeilingDb).toBe(-1.28);
    expect(balanced.outputSoftClipMix).toBe(8.16);

    expect(maximumProtection.outputCeilingDb).toBe(-1.36);
    expect(maximumProtection.outputSoftClipMix).toBe(21.2);
  });

  it("turns the protector fully off when the off mode is selected", () => {
    const runtime = applyQualityProtector(
      buildDspRuntimeParameters(300, applyQualityPreset("balanced", "off"))
    );

    expect(runtime.protectorEnabled).toBe(false);
    expect(runtime.outputLimiterEnabled).toBe(false);
    expect(runtime.lowBandTrimDb).toBe(0);
    expect(runtime.lowBandMakeupDb).toBe(0);
    expect(runtime.lowBandThresholdOffsetDb).toBe(0);
    expect(runtime.lowBandRatioBias).toBe(0);
    expect(runtime.midHighThresholdOffsetDb).toBe(0);
    expect(runtime.outputSoftClipMix).toBe(0);
    expect(runtime.clarityPresenceTiltDb).toBe(0);
  });

  it("reports protection action as bypassed and counts clipping when the protector is off", () => {
    const runtime = applyQualityProtector(
      buildDspRuntimeParameters(5000, applyQualityPreset("maximum_loudness", "off"))
    );
    const metrics = deriveMetricsFromPeaks(runtime, 0.9, 1.18, createDefaultMetrics(true));

    expect(metrics.protectionBypassed).toBe(true);
    expect(metrics.protectorActionDb).toBe(0);
    expect(metrics.clipEvents).toBe(1);
    expect(metrics.clipPeak).toBe(1.18);
    expect(deriveWarningFromMetrics(metrics)).toBe("danger");
  });

  it("normalizes peaks and respects the clipping threshold boundary exactly", () => {
    const runtime = applyQualityProtector(buildDspRuntimeParameters(1000, applyQualityPreset("balanced")));
    const previousMetrics = {
      ...createDefaultMetrics(false),
      clipEvents: 2,
      clipPeak: 1.1
    };

    const negativeInput = deriveMetricsFromPeaks(runtime, -0.4, 0.25, previousMetrics);
    const thresholdBoundary = deriveMetricsFromPeaks(runtime, 0.5, 1.0005, previousMetrics);
    const controlled = deriveMetricsFromPeaks(runtime, 0.5, 0.25, previousMetrics);

    expect(negativeInput.inputPeak).toBe(0);
    expect(negativeInput.protectorActionDb).toBe(0);

    expect(thresholdBoundary.clipEvents).toBe(2);
    expect(thresholdBoundary.clipPeak).toBe(1.1);

    expect(controlled.protectorActionDb).toBe(20.02);
    expect(controlled.clipEvents).toBe(2);
  });

  it("derives protection load and clipping safety from live runtime metrics", () => {
    const metrics = deriveMetricsFromPeaks(
      applyQualityProtector(buildDspRuntimeParameters(5000, applyQualityPreset("maximum_loudness"))),
      0.94,
      0.79,
      createDefaultMetrics(false)
    );

    expect(deriveProtectionLoadPercent(metrics)).toBeGreaterThan(0);
    expect(deriveClippingSafetyMarginDb(metrics.outputPeak)).toBeGreaterThan(0);
    expect(deriveClippingSafetyMarginDb(0)).toBeNull();
    expect(deriveClippingSafetyMarginDb(1.08)).toBeLessThan(0);
  });

  it("derives exact load and safety values at important thresholds", () => {
    expect(
      deriveProtectionLoadPercent({
        protectionBypassed: false,
        protectorActionDb: 9,
        inputPeak: 0.01,
        outputPeak: 0.49
      })
    ).toBe(50);

    expect(
      deriveProtectionLoadPercent({
        protectionBypassed: false,
        protectorActionDb: 1,
        inputPeak: 0.015,
        outputPeak: 0.015
      })
    ).toBe(5);

    expect(deriveClippingSafetyMarginDb(0.015)).toBeNull();
    expect(deriveClippingSafetyMarginDb(0.5)).toBe(6);
  });

  it("keeps protection load at zero when the protector is bypassed", () => {
    expect(
      deriveProtectionLoadPercent({
        protectionBypassed: true,
        protectorActionDb: 12,
        inputPeak: 0.92,
        outputPeak: 1.05
      })
    ).toBe(0);
  });

  it("creates default metrics with explicit and implicit bypass states", () => {
    expect(createDefaultMetrics().protectionBypassed).toBe(false);
    expect(createDefaultMetrics(true).protectionBypassed).toBe(true);
  });

  it("handles invalid gain, custom inference, and near-silence safety calculations", () => {
    const customSettings = sanitizeAdvancedAudioSettings({
      qualityPreset: "custom",
      qualityProtectorMode: "maximum_protection",
      ceilingDb: -1.5,
      multibandDepth: 88,
      softClipMix: 27
    });
    const runtime = buildDspRuntimeParameters(650, customSettings);

    expect(runtime.inputDriveDb).toBeGreaterThan(0);
    expect(runtime.boostIntensity).toBeGreaterThan(0);
    expect(deriveProtectionLoadPercent({
      protectionBypassed: false,
      protectorActionDb: 12,
      inputPeak: 0.01,
      outputPeak: 0.01
    })).toBe(0);
    expect(deriveClippingSafetyMarginDb(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("exposes preset/protector helpers and all warning levels", () => {
    expect(isPresetSettingsMatch("balanced", applyQualityPreset("balanced"))).toBe(true);
    expect(isPresetSettingsMatch("balanced", applyQualityPreset("maximum_clarity"))).toBe(false);
    expect(getQualityProtectorDefinition("clarity").clarityPresenceTiltDb).toBeGreaterThan(0);
    expect(isProtectionBypassedMode("off")).toBe(true);
    expect(isProtectionBypassedSettings(applyQualityPreset("balanced", "off"))).toBe(true);

    expect(
      deriveWarningFromMetrics({
        ...createDefaultMetrics(false),
        protectorActionDb: 6,
        inputPeak: 0.5,
        outputPeak: 0.4
      })
    ).toBe("high");

    expect(
      deriveWarningFromMetrics({
        ...createDefaultMetrics(false),
        protectorActionDb: 0.5,
        inputPeak: 0.2,
        outputPeak: 0.3
      })
    ).toBe("none");
  });

  it("treats bypassed and protected warning thresholds as exact boundaries", () => {
    expect(
      deriveWarningFromMetrics({
        ...createDefaultMetrics(true),
        clipEvents: 0,
        clipPeak: 1.02,
        inputPeak: 0.1,
        outputPeak: 0.5
      })
    ).toBe("danger");

    expect(
      deriveWarningFromMetrics({
        ...createDefaultMetrics(true),
        clipEvents: 0,
        clipPeak: 0,
        inputPeak: 0.88,
        outputPeak: 0.5
      })
    ).toBe("high");

    expect(
      deriveWarningFromMetrics({
        ...createDefaultMetrics(false),
        clipEvents: 0,
        clipPeak: 0,
        inputPeak: 0.1,
        outputPeak: 0.5,
        protectorActionDb: 14
      })
    ).toBe("danger");

    expect(
      deriveWarningFromMetrics({
        ...createDefaultMetrics(false),
        clipEvents: 0,
        clipPeak: 0,
        inputPeak: 0.1,
        outputPeak: 0.4,
        protectorActionDb: 5
      })
    ).toBe("high");

    expect(
      deriveWarningFromMetrics({
        ...createDefaultMetrics(false),
        clipEvents: 0,
        clipPeak: 0,
        inputPeak: 0.1,
        outputPeak: 0.92,
        protectorActionDb: 4
      })
    ).toBe("high");
  });

  it("derives bypassed warnings for high and quiet peaks without forcing danger", () => {
    expect(
      deriveWarningFromMetrics({
        ...createDefaultMetrics(true),
        inputPeak: 0.9,
        outputPeak: 0.97
      })
    ).toBe("high");

    expect(
      deriveWarningFromMetrics({
        ...createDefaultMetrics(true),
        inputPeak: 0.4,
        outputPeak: 0.5
      })
    ).toBe("none");
  });

  it("treats invalid gain input and clipping events as safe defaults with danger escalation", () => {
    const runtime = buildDspRuntimeParameters(Number.NaN, applyQualityPreset("balanced"));

    expect(runtime.boostIntensity).toBe(0);
    expect(runtime.extendedBoostIntensity).toBe(0);
    expect(runtime.inputDriveDb).toBe(0);

    expect(
      deriveWarningFromMetrics({
        ...createDefaultMetrics(false),
        clipEvents: 1,
        inputPeak: 0.2,
        outputPeak: 0.4
      })
    ).toBe("danger");
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

  it("only bypasses protection when both protection stages are disabled and soft clip is effectively zero", () => {
    const offRuntime = applyQualityProtector(
      buildDspRuntimeParameters(300, applyQualityPreset("balanced", "off"))
    );

    expect(deriveMetricsFromPeaks(offRuntime, 0.8, 0.4).protectionBypassed).toBe(true);
    expect(
      deriveMetricsFromPeaks({ ...offRuntime, outputLimiterEnabled: true }, 0.8, 0.4).protectionBypassed
    ).toBe(false);
    expect(
      deriveMetricsFromPeaks(
        { ...offRuntime, protectorEnabled: false, outputLimiterEnabled: false, outputSoftClipMix: 0.02 },
        0.8,
        0.4
      ).protectionBypassed
    ).toBe(false);
  });

  it("exposes the exact static preset and protector tables used by the popup", () => {
    expect(applyQualityPreset("maximum_loudness")).toEqual({
      qualityPreset: "maximum_loudness",
      qualityProtectorMode: "balanced",
      ceilingDb: -0.8,
      lookaheadMs: 3,
      releaseMs: 120,
      multibandDepth: 62,
      softClipMix: 28
    });

    expect(getQualityProtectorDefinition("balanced")).toEqual({
      protectorEnabled: true,
      outputLimiterEnabled: true,
      lowBandTrimDb: -0.45,
      lowBandMakeupDb: 0.1,
      lowBandThresholdOffsetDb: -1.25,
      lowBandRatioBias: 0.08,
      midHighThresholdOffsetDb: -0.35,
      ceilingOffsetDb: -0.08,
      softClipMultiplier: 0.92,
      softClipAdd: 0.8,
      clarityPresenceTiltDb: 0.1
    });

    expect(getQualityProtectorDefinition("clarity")).toEqual({
      protectorEnabled: true,
      outputLimiterEnabled: true,
      lowBandTrimDb: -1.75,
      lowBandMakeupDb: -0.35,
      lowBandThresholdOffsetDb: -2.6,
      lowBandRatioBias: 0.18,
      midHighThresholdOffsetDb: -0.9,
      ceilingOffsetDb: -0.16,
      softClipMultiplier: 0.72,
      softClipAdd: 0,
      clarityPresenceTiltDb: 1.5
    });

    expect(getQualityProtectorDefinition("maximum_protection")).toEqual({
      protectorEnabled: true,
      outputLimiterEnabled: true,
      lowBandTrimDb: -1.15,
      lowBandMakeupDb: -0.25,
      lowBandThresholdOffsetDb: -4.4,
      lowBandRatioBias: 0.42,
      midHighThresholdOffsetDb: -2.5,
      ceilingOffsetDb: -0.36,
      softClipMultiplier: 1.18,
      softClipAdd: 3.5,
      clarityPresenceTiltDb: 0.35
    });
  });

  it("keeps threshold boundaries exact for bypassed warnings and custom-drive interpolation clamps", () => {
    expect(
      deriveWarningFromMetrics({
        ...createDefaultMetrics(true),
        clipEvents: 0,
        clipPeak: 1.015,
        inputPeak: 0.2,
        outputPeak: 1.0005
      })
    ).toBe("high");

    expect(
      deriveWarningFromMetrics({
        ...createDefaultMetrics(true),
        clipEvents: 1,
        clipPeak: 1.0004,
        inputPeak: 0.2,
        outputPeak: 1.0004
      })
    ).toBe("danger");

    const customQuiet = buildDspRuntimeParameters(
      100,
      sanitizeAdvancedAudioSettings({
        qualityPreset: "custom",
        qualityProtectorMode: "balanced",
        ceilingDb: -0.3,
        multibandDepth: 0,
        softClipMix: 0
      })
    );
    const customExtreme = buildDspRuntimeParameters(
      10_000,
      sanitizeAdvancedAudioSettings({
        qualityPreset: "custom",
        qualityProtectorMode: "balanced",
        ceilingDb: -2,
        multibandDepth: 100,
        softClipMix: 40
      })
    );

    expect(customQuiet.inputDriveDb).toBe(0);
    expect(customExtreme.inputDriveDb).toBe(30);
    expect(customExtreme.outputSoftClipMix).toBe(40);
  });
});
