/**
 * @fileoverview Shared popup copy helpers for Boost Profile presets.
 * @module popup/quality-preset-copy
 */

import type { I18nKey } from "../generated/i18n-types";
import { translate, type UiCatalog } from "../shared/runtime-i18n";
import type { QualityPreset } from "../shared/types";

interface QualityPresetCopyDefinition {
  labelKey: I18nKey;
  subtitleKey: I18nKey;
}

export const QUALITY_PRESET_COPY: Record<QualityPreset, QualityPresetCopyDefinition> = {
  balanced: {
    labelKey: "presetBalanced",
    subtitleKey: "presetBalancedSubtitle"
  },
  vocal_presence: {
    labelKey: "presetVocalPresence",
    subtitleKey: "presetVocalPresenceSubtitle"
  },
  maximum_clarity: {
    labelKey: "presetMaximumClarity",
    subtitleKey: "presetMaximumClaritySubtitle"
  },
  smooth_bright: {
    labelKey: "presetSmoothBright",
    subtitleKey: "presetSmoothBrightSubtitle"
  },
  warm_cinematic: {
    labelKey: "presetWarmCinematic",
    subtitleKey: "presetWarmCinematicSubtitle"
  },
  maximum_loudness: {
    labelKey: "presetMaximumLoudness",
    subtitleKey: "presetMaximumLoudnessSubtitle"
  },
  bass_boost: {
    labelKey: "presetBassBoost",
    subtitleKey: "presetBassBoostSubtitle"
  },
  punch_drive: {
    labelKey: "presetPunchDrive",
    subtitleKey: "presetPunchDriveSubtitle"
  },
  custom: {
    labelKey: "presetCustom",
    subtitleKey: "presetCustomSubtitle"
  }
};

export function getQualityPresetCopy(preset: QualityPreset, catalog: UiCatalog | null): string {
  const definition = QUALITY_PRESET_COPY[preset];
  return catalog ? translate(catalog, definition.labelKey) : preset;
}

export function getQualityPresetSubtitleCopy(
  preset: QualityPreset,
  catalog: UiCatalog | null
): string {
  const definition = QUALITY_PRESET_COPY[preset];
  return catalog ? translate(catalog, definition.subtitleKey) : definition.subtitleKey;
}
