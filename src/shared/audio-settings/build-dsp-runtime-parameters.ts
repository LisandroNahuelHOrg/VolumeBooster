import {
  LEGACY_MAX_GAIN_PERCENT,
  MAX_GAIN_PERCENT,
  MIN_GAIN_PERCENT
} from "../constants";
import type { AdvancedAudioSettings } from "../types";
import type { DspRuntimeParameters } from "./contracts";
import { DSP_PROFILE_TABLE } from "./dsp-profile-table";
import { MAX_OUTPUT_SOFT_CLIP_MIX, MAX_TOTAL_INPUT_DRIVE_DB } from "./limits";
import { clamp } from "./internal/clamp";
import { clamp01 } from "./internal/clamp-01";
import { clampGainPercent } from "./internal/clamp-gain-percent";
import { easeOutQuad } from "./internal/ease-out-quad";
import { inferCustomInputDriveMaxDb } from "./internal/infer-custom-input-drive-max-db";
import { lerp } from "./internal/lerp";
import { roundTo } from "./internal/round-to";

/** Translates user-facing settings into runtime DSP parameters. */
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
  const presetProfile = settings.qualityPreset === "custom" ? null : DSP_PROFILE_TABLE[settings.qualityPreset];
  const inputDriveMaxDb = presetProfile?.inputDriveMaxDb ?? inferCustomInputDriveMaxDb(settings);
  const profileTone = presetProfile
    ? {
        toneLowBandGainDb: presetProfile.toneLowBandGainDb,
        toneMidBandGainDb: presetProfile.toneMidBandGainDb
      }
    : {
        toneLowBandGainDb: 0,
        toneMidBandGainDb: 0
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
