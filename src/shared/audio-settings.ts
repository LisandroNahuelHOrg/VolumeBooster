/**
 * @fileoverview DSP preset tables and metric derivation helpers shared by the
 * manual and automatic audio lanes.
 * @module shared/audio-settings
 */

import {
  DEFAULT_GAIN_PERCENT,
  LEGACY_MAX_GAIN_PERCENT,
  MAX_GAIN_PERCENT,
  MIN_GAIN_PERCENT
} from "./constants";
import type {
  AdvancedAudioSettings,
  AudioQualityProtectorMode,
  DspRuntimeMetrics,
  LevelWarning,
  QualityPreset
} from "./types";

/** Static definition of an advanced sound-mode preset. */
export interface DspProfileDefinition {
  inputDriveMaxDb: number;
  ceilingDb: number;
  lookaheadMs: number;
  releaseMs: number;
  multibandDepth: number;
  softClipMix: number;
  toneLowBandGainDb: number;
  toneMidBandGainDb: number;
}

/** Runtime DSP parameters derived from user settings and current gain. */
export interface DspRuntimeParameters {
  boostIntensity: number;
  extendedBoostIntensity: number;
  inputDriveDb: number;
  lookaheadMs: number;
  releaseMs: number;
  multibandDepth: number;
  qualityProtectorMode: AudioQualityProtectorMode;
  protectorEnabled: boolean;
  outputLimiterEnabled: boolean;
  lowBandTrimDb: number;
  lowBandMakeupDb: number;
  lowBandThresholdOffsetDb: number;
  lowBandRatioBias: number;
  midHighThresholdOffsetDb: number;
  outputCeilingDb: number;
  outputSoftClipMix: number;
  clarityPresenceTiltDb: number;
  toneLowBandGainDb: number;
  toneMidBandGainDb: number;
}

/** Static definition of an audio-quality-protector mode. */
export interface QualityProtectorDefinition {
  protectorEnabled: boolean;
  outputLimiterEnabled: boolean;
  lowBandTrimDb: number;
  lowBandMakeupDb: number;
  lowBandThresholdOffsetDb: number;
  lowBandRatioBias: number;
  midHighThresholdOffsetDb: number;
  ceilingOffsetDb: number;
  softClipMultiplier: number;
  softClipAdd: number;
  clarityPresenceTiltDb: number;
}

const MAX_TOTAL_INPUT_DRIVE_DB = 30;
const MAX_OUTPUT_SOFT_CLIP_MIX = 40;
const CLIP_THRESHOLD = 1.0005;

/** Stable user-visible ordering for sound-mode presets. */
export const QUALITY_PRESET_ORDER: QualityPreset[] = [
  "balanced",
  "maximum_clarity",
  "maximum_loudness",
  "bass_boost",
  "custom"
];

/** Stable user-visible ordering for protector modes. */
export const QUALITY_PROTECTOR_MODE_ORDER: AudioQualityProtectorMode[] = [
  "off",
  "balanced",
  "bass_aware",
  "clarity",
  "maximum_protection"
];

/** Base DSP profile parameters used by named sound modes. */
export const DSP_PROFILE_TABLE: Record<Exclude<QualityPreset, "custom">, DspProfileDefinition> = {
  balanced: {
    inputDriveMaxDb: 14,
    ceilingDb: -1,
    lookaheadMs: 5,
    releaseMs: 160,
    multibandDepth: 45,
    softClipMix: 15,
    toneLowBandGainDb: 0,
    toneMidBandGainDb: 0
  },
  maximum_clarity: {
    inputDriveMaxDb: 11,
    ceilingDb: -1.2,
    lookaheadMs: 6,
    releaseMs: 220,
    multibandDepth: 35,
    softClipMix: 8,
    toneLowBandGainDb: 0,
    toneMidBandGainDb: 0
  },
  maximum_loudness: {
    inputDriveMaxDb: 17,
    ceilingDb: -0.8,
    lookaheadMs: 3,
    releaseMs: 120,
    multibandDepth: 62,
    softClipMix: 28,
    toneLowBandGainDb: 0,
    toneMidBandGainDb: 0
  },
  bass_boost: {
    inputDriveMaxDb: 15,
    ceilingDb: -1.05,
    lookaheadMs: 4.8,
    releaseMs: 175,
    multibandDepth: 52,
    softClipMix: 18,
    toneLowBandGainDb: 3.2,
    toneMidBandGainDb: -0.45
  }
};

/** Base quality-protector parameters used by named protector modes. */
export const QUALITY_PROTECTOR_TABLE: Record<AudioQualityProtectorMode, QualityProtectorDefinition> = {
  off: {
    protectorEnabled: false,
    outputLimiterEnabled: false,
    lowBandTrimDb: 0,
    lowBandMakeupDb: 0,
    lowBandThresholdOffsetDb: 0,
    lowBandRatioBias: 0,
    midHighThresholdOffsetDb: 0,
    ceilingOffsetDb: 0,
    softClipMultiplier: 0,
    softClipAdd: 0,
    clarityPresenceTiltDb: 0
  },
  balanced: {
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
  },
  bass_aware: {
    protectorEnabled: true,
    outputLimiterEnabled: true,
    lowBandTrimDb: 0.55,
    lowBandMakeupDb: 1.35,
    lowBandThresholdOffsetDb: 1.4,
    lowBandRatioBias: -0.12,
    midHighThresholdOffsetDb: -1.8,
    ceilingOffsetDb: -0.12,
    softClipMultiplier: 0.96,
    softClipAdd: 1.2,
    clarityPresenceTiltDb: 0.18
  },
  clarity: {
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
  },
  maximum_protection: {
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
  }
};

/** Default advanced audio settings applied to new installs and resets. */
export const DEFAULT_ADVANCED_AUDIO_SETTINGS: AdvancedAudioSettings = {
  qualityPreset: "balanced",
  qualityProtectorMode: "balanced",
  ceilingDb: DSP_PROFILE_TABLE.balanced.ceilingDb,
  lookaheadMs: DSP_PROFILE_TABLE.balanced.lookaheadMs,
  releaseMs: DSP_PROFILE_TABLE.balanced.releaseMs,
  multibandDepth: DSP_PROFILE_TABLE.balanced.multibandDepth,
  softClipMix: DSP_PROFILE_TABLE.balanced.softClipMix
};

/**
 * Builds the advanced settings snapshot that corresponds to a named sound mode.
 *
 * @param preset - Preset to apply.
 * @param qualityProtectorMode - Protector mode to keep while switching presets.
 * @returns Advanced settings initialized from the preset table.
 */
export function applyQualityPreset(
  preset: Exclude<QualityPreset, "custom">,
  qualityProtectorMode = DEFAULT_ADVANCED_AUDIO_SETTINGS.qualityProtectorMode
): AdvancedAudioSettings {
  const profile = DSP_PROFILE_TABLE[preset];

  return {
    qualityPreset: preset,
    qualityProtectorMode,
    ceilingDb: profile.ceilingDb,
    lookaheadMs: profile.lookaheadMs,
    releaseMs: profile.releaseMs,
    multibandDepth: profile.multibandDepth,
    softClipMix: profile.softClipMix
  };
}

/**
 * Sanitizes partial persisted advanced settings into a complete valid object.
 *
 * @param settings - Partial or untrusted settings snapshot.
 * @returns Fully sanitized advanced settings.
 */
export function sanitizeAdvancedAudioSettings(
  settings: Partial<AdvancedAudioSettings> | undefined
): AdvancedAudioSettings {
  const preset = sanitizeQualityPreset(settings?.qualityPreset);
  const qualityProtectorMode = sanitizeQualityProtectorMode(settings?.qualityProtectorMode);
  const presetDefaults =
    preset === "custom"
      ? { ...DEFAULT_ADVANCED_AUDIO_SETTINGS, qualityPreset: "custom", qualityProtectorMode }
      : applyQualityPreset(preset, qualityProtectorMode);

  return {
    qualityPreset: preset,
    qualityProtectorMode,
    ceilingDb: clampRound(settings?.ceilingDb, -2, -0.3, presetDefaults.ceilingDb, 2),
    lookaheadMs: clampRound(settings?.lookaheadMs, 1, 8, presetDefaults.lookaheadMs, 1),
    releaseMs: clampRound(settings?.releaseMs, 60, 350, presetDefaults.releaseMs, 0),
    multibandDepth: clampRound(settings?.multibandDepth, 0, 100, presetDefaults.multibandDepth, 0),
    softClipMix: clampRound(settings?.softClipMix, 0, MAX_OUTPUT_SOFT_CLIP_MIX, presetDefaults.softClipMix, 1)
  };
}

/**
 * Translates user-facing settings into runtime DSP parameters.
 *
 * @param gainPercent - Current boost percentage.
 * @param settings - Advanced settings selected by the user.
 * @returns Runtime DSP parameters consumed by the audio engine.
 */
export function buildDspRuntimeParameters(
  gainPercent: number,
  settings: AdvancedAudioSettings
): DspRuntimeParameters {
  const clampedGainPercent = clampGainPercent(gainPercent);
  const boostIntensity = clamp01(
    (Math.min(clampedGainPercent, LEGACY_MAX_GAIN_PERCENT) - MIN_GAIN_PERCENT) /
      (LEGACY_MAX_GAIN_PERCENT - MIN_GAIN_PERCENT)
  );
  const extendedBoostIntensity = clamp01(
    (clampedGainPercent - LEGACY_MAX_GAIN_PERCENT) / (MAX_GAIN_PERCENT - LEGACY_MAX_GAIN_PERCENT)
  );
  const inputDriveMaxDb =
    settings.qualityPreset === "custom"
      ? inferCustomInputDriveMaxDb(settings)
      : DSP_PROFILE_TABLE[settings.qualityPreset].inputDriveMaxDb;
  const profileTone =
    settings.qualityPreset === "custom"
      ? { toneLowBandGainDb: 0, toneMidBandGainDb: 0 }
      : {
          toneLowBandGainDb: DSP_PROFILE_TABLE[settings.qualityPreset].toneLowBandGainDb,
          toneMidBandGainDb: DSP_PROFILE_TABLE[settings.qualityPreset].toneMidBandGainDb
        };
  const additionalDriveHeadroomDb = Math.max(0, MAX_TOTAL_INPUT_DRIVE_DB - inputDriveMaxDb);

  return {
    boostIntensity,
    extendedBoostIntensity,
    inputDriveDb: roundTo(
      lerp(0, inputDriveMaxDb, boostIntensity) +
        lerp(0, additionalDriveHeadroomDb, easeOutQuad(extendedBoostIntensity)),
      2
    ),
    lookaheadMs: settings.lookaheadMs,
    releaseMs: settings.releaseMs,
    multibandDepth: settings.multibandDepth,
    qualityProtectorMode: settings.qualityProtectorMode,
    protectorEnabled: true,
    outputLimiterEnabled: true,
    lowBandTrimDb: 0,
    lowBandMakeupDb: 0,
    lowBandThresholdOffsetDb: 0,
    lowBandRatioBias: 0,
    midHighThresholdOffsetDb: 0,
    outputCeilingDb: settings.ceilingDb,
    outputSoftClipMix: roundTo(
      clamp(
        lerp(0, settings.softClipMix, boostIntensity) +
          lerp(0, 12, easeOutQuad(extendedBoostIntensity)),
        0,
        MAX_OUTPUT_SOFT_CLIP_MIX
      ),
      2
    ),
    clarityPresenceTiltDb: 0,
    toneLowBandGainDb: profileTone.toneLowBandGainDb,
    toneMidBandGainDb: profileTone.toneMidBandGainDb
  };
}

/**
 * Applies the selected quality-protector mode on top of a runtime DSP state.
 *
 * @param runtime - Base runtime DSP parameters.
 * @returns Runtime parameters with protector-specific overrides applied.
 */
export function applyQualityProtector(runtime: DspRuntimeParameters): DspRuntimeParameters {
  const protector = getQualityProtectorDefinition(runtime.qualityProtectorMode);

  return {
    ...runtime,
    protectorEnabled: protector.protectorEnabled,
    outputLimiterEnabled: protector.outputLimiterEnabled,
    lowBandTrimDb: protector.lowBandTrimDb,
    lowBandMakeupDb: protector.lowBandMakeupDb,
    lowBandThresholdOffsetDb: protector.lowBandThresholdOffsetDb,
    lowBandRatioBias: protector.lowBandRatioBias,
    midHighThresholdOffsetDb: protector.midHighThresholdOffsetDb,
    outputCeilingDb: roundTo(runtime.outputCeilingDb + protector.ceilingOffsetDb, 2),
    outputSoftClipMix: protector.outputLimiterEnabled
      ? roundTo(
          clamp(
            runtime.outputSoftClipMix * protector.softClipMultiplier + protector.softClipAdd,
            0,
            MAX_OUTPUT_SOFT_CLIP_MIX
          ),
          2
        )
      : 0,
    clarityPresenceTiltDb: protector.clarityPresenceTiltDb
  };
}

/**
 * Resolves a sanitized quality-protector definition for a mode.
 *
 * @param mode - Requested protector mode.
 * @returns Matching static protector definition.
 */
export function getQualityProtectorDefinition(
  mode: AudioQualityProtectorMode
): QualityProtectorDefinition {
  return QUALITY_PROTECTOR_TABLE[sanitizeQualityProtectorMode(mode)];
}

/**
 * Derives runtime metrics from observed input and output peaks.
 *
 * @param runtime - Runtime DSP parameters that produced the peaks.
 * @param inputPeak - Peak before output protection.
 * @param outputPeak - Peak after output protection.
 * @param previousMetrics - Previous metrics used to accumulate clip counters.
 * @returns Updated runtime metrics snapshot.
 */
export function deriveMetricsFromPeaks(
  runtime: DspRuntimeParameters,
  inputPeak: number,
  outputPeak: number,
  previousMetrics: DspRuntimeMetrics = createDefaultMetrics()
): DspRuntimeMetrics {
  const normalizedInputPeak = roundTo(Math.max(0, inputPeak), 4);
  const normalizedOutputPeak = roundTo(Math.max(0, outputPeak), 4);
  const protectionBypassed = isProtectionBypassedRuntime(runtime);
  const inputDbWithDrive = peakToDb(normalizedInputPeak) + runtime.inputDriveDb;
  const outputDb = peakToDb(normalizedOutputPeak);
  const protectorActionDb = protectionBypassed
    ? 0
    : roundTo(Math.max(0, inputDbWithDrive - outputDb), 2);
  const clipDetected = normalizedOutputPeak > CLIP_THRESHOLD;

  return {
    protectorActionDb,
    clipEvents: clipDetected ? Math.min(previousMetrics.clipEvents + 1, 9999) : previousMetrics.clipEvents,
    clipPeak: clipDetected
      ? roundTo(Math.max(previousMetrics.clipPeak, normalizedOutputPeak), 4)
      : previousMetrics.clipPeak,
    protectionBypassed,
    inputPeak: normalizedInputPeak,
    outputPeak: normalizedOutputPeak
  };
}

/**
 * Converts runtime metrics into the coarse warning severity used by the UI.
 *
 * @param metrics - Runtime DSP metrics.
 * @returns Warning severity for the current session.
 */
export function deriveWarningFromMetrics(metrics: DspRuntimeMetrics): LevelWarning {
  if (metrics.protectionBypassed) {
    if (metrics.clipEvents > 0 || metrics.clipPeak > 1.015 || metrics.outputPeak > CLIP_THRESHOLD) {
      return "danger";
    }

    if (metrics.outputPeak >= 0.96 || metrics.inputPeak >= 0.88) {
      return "high";
    }

    return "none";
  }

  if (metrics.clipEvents > 0 || metrics.clipPeak > CLIP_THRESHOLD || metrics.protectorActionDb >= 14) {
    return "danger";
  }

  if (metrics.protectorActionDb >= 5 || metrics.outputPeak >= 0.92) {
    return "high";
  }

  return "none";
}

/**
 * Converts runtime metrics into the user-facing protection-load percentage.
 *
 * @param metrics - Subset of metrics required for the load calculation.
 * @returns Rounded protection-load percentage.
 */
export function deriveProtectionLoadPercent(
  metrics: Pick<DspRuntimeMetrics, "protectionBypassed" | "protectorActionDb" | "inputPeak" | "outputPeak">
): number {
  if (metrics.protectionBypassed) {
    return 0;
  }

  if (Math.max(metrics.inputPeak, metrics.outputPeak) < 0.015) {
    return 0;
  }

  const actionWeight = clamp01(metrics.protectorActionDb / 18);
  const pressureWeight = clamp01(metrics.outputPeak / 0.98);

  return Math.round((actionWeight * 0.82 + pressureWeight * 0.18) * 100);
}

/**
 * Computes the remaining output headroom before clipping, in decibels.
 *
 * @param outputPeak - Latest normalized output peak.
 * @returns Safety margin in dB, or `null` when the signal is effectively idle.
 */
export function deriveClippingSafetyMarginDb(outputPeak: number): number | null {
  if (!Number.isFinite(outputPeak) || outputPeak <= 0.015) {
    return null;
  }

  return roundTo(20 * Math.log10(1 / Math.max(outputPeak, 1e-4)), 1);
}

/**
 * Creates a zeroed metrics object for a new or reset session.
 *
 * @param protectionBypassed - Whether the session starts with protection disabled.
 * @returns Empty metrics snapshot.
 */
export function createDefaultMetrics(protectionBypassed = false): DspRuntimeMetrics {
  return {
    protectorActionDb: 0,
    clipEvents: 0,
    clipPeak: 0,
    protectionBypassed,
    inputPeak: 0,
    outputPeak: 0
  };
}

/**
 * Indicates whether a protector mode bypasses protection entirely.
 *
 * @param mode - Protector mode to inspect.
 * @returns `true` when the mode disables protection.
 */
export function isProtectionBypassedMode(mode: AudioQualityProtectorMode): boolean {
  return !QUALITY_PROTECTOR_TABLE[sanitizeQualityProtectorMode(mode)].protectorEnabled;
}

/**
 * Indicates whether the current advanced settings bypass protection.
 *
 * @param settings - Advanced settings snapshot.
 * @returns `true` when the selected protector mode is bypassed.
 */
export function isProtectionBypassedSettings(settings: AdvancedAudioSettings): boolean {
  return isProtectionBypassedMode(settings.qualityProtectorMode);
}

/**
 * Checks whether an advanced-settings snapshot still matches a named sound mode.
 *
 * @param preset - Preset to compare against.
 * @param settings - Current advanced settings snapshot.
 * @returns `true` when the settings still match the preset defaults.
 */
export function isPresetSettingsMatch(
  preset: Exclude<QualityPreset, "custom">,
  settings: AdvancedAudioSettings
): boolean {
  const expected = applyQualityPreset(preset);

  return (
    roundTo(settings.ceilingDb, 2) === roundTo(expected.ceilingDb, 2) &&
    roundTo(settings.lookaheadMs, 1) === roundTo(expected.lookaheadMs, 1) &&
    roundTo(settings.releaseMs, 0) === roundTo(expected.releaseMs, 0) &&
    roundTo(settings.multibandDepth, 0) === roundTo(expected.multibandDepth, 0) &&
    roundTo(settings.softClipMix, 1) === roundTo(expected.softClipMix, 1)
  );
}

/**
 * Promotes custom-looking settings back to a named preset when they match one.
 *
 * @param settings - Current advanced settings snapshot.
 * @returns Settings with `qualityPreset` normalized to the best matching preset.
 */
export function maybePromotePreset(settings: AdvancedAudioSettings): AdvancedAudioSettings {
  for (const preset of QUALITY_PRESET_ORDER) {
    if (preset !== "custom" && isPresetSettingsMatch(preset, settings)) {
      return { ...settings, qualityPreset: preset };
    }
  }

  return { ...settings, qualityPreset: "custom" };
}

function isProtectionBypassedRuntime(runtime: DspRuntimeParameters): boolean {
  return !runtime.protectorEnabled && !runtime.outputLimiterEnabled && runtime.outputSoftClipMix <= 0.01;
}

function sanitizeQualityPreset(preset: QualityPreset | undefined): QualityPreset {
  return QUALITY_PRESET_ORDER.includes(preset as QualityPreset)
    ? (preset as QualityPreset)
    : DEFAULT_ADVANCED_AUDIO_SETTINGS.qualityPreset;
}

function sanitizeQualityProtectorMode(
  mode: AudioQualityProtectorMode | undefined
): AudioQualityProtectorMode {
  return QUALITY_PROTECTOR_MODE_ORDER.includes(mode as AudioQualityProtectorMode)
    ? (mode as AudioQualityProtectorMode)
    : DEFAULT_ADVANCED_AUDIO_SETTINGS.qualityProtectorMode;
}

function easeOutQuad(value: number): number {
  const clamped = clamp01(value);
  return 1 - (1 - clamped) * (1 - clamped);
}

function inferCustomInputDriveMaxDb(settings: AdvancedAudioSettings): number {
  const inferred =
    10.5 +
    settings.multibandDepth * 0.055 +
    settings.softClipMix * 0.05 +
    normalizePeak(-settings.ceilingDb, 0.3, 2) * 1.6;

  return clampRound(inferred, 10.5, 18, 14, 2);
}

function peakToDb(value: number): number {
  return 20 * Math.log10(Math.max(value, 1e-4));
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function normalizePeak(value: number, min: number, max: number): number {
  if (max <= min) {
    return 0;
  }

  return clamp01((value - min) / (max - min));
}

function clampGainPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_GAIN_PERCENT;
  }

  return Math.min(MAX_GAIN_PERCENT, Math.max(MIN_GAIN_PERCENT, Math.round(value)));
}

function clampRound(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
  precision: number
): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return roundTo(clamp(value as number, min, max), precision);
}

function roundTo(value: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
