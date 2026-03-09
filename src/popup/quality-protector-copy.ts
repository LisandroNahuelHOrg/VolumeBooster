/**
 * @fileoverview Shared popup copy helpers for Audio Quality Protector modes.
 * @module popup/quality-protector-copy
 */

import type { I18nKey } from "../generated/i18n-types";
import { translate, type UiCatalog } from "../shared/runtime-i18n";
import type { AudioQualityProtectorMode } from "../shared/types";

interface QualityProtectorCopyDefinition {
  labelKey: I18nKey;
  subtitleKey: I18nKey;
}

export const QUALITY_PROTECTOR_COPY: Record<AudioQualityProtectorMode, QualityProtectorCopyDefinition> = {
  off: {
    labelKey: "qualityProtectorOff",
    subtitleKey: "qualityProtectorOffSubtitle"
  },
  balanced: {
    labelKey: "qualityProtectorBalanced",
    subtitleKey: "qualityProtectorBalancedSubtitle"
  },
  warmth: {
    labelKey: "qualityProtectorWarmth",
    subtitleKey: "qualityProtectorWarmthSubtitle"
  },
  bass_aware: {
    labelKey: "qualityProtectorBassAware",
    subtitleKey: "qualityProtectorBassAwareSubtitle"
  },
  vocal_focus: {
    labelKey: "qualityProtectorVocalFocus",
    subtitleKey: "qualityProtectorVocalFocusSubtitle"
  },
  clarity: {
    labelKey: "qualityProtectorClarity",
    subtitleKey: "qualityProtectorClaritySubtitle"
  },
  treble_safe: {
    labelKey: "qualityProtectorTrebleSafe",
    subtitleKey: "qualityProtectorTrebleSafeSubtitle"
  },
  punch_preserve: {
    labelKey: "qualityProtectorPunchPreserve",
    subtitleKey: "qualityProtectorPunchPreserveSubtitle"
  },
  maximum_protection: {
    labelKey: "qualityProtectorMaximumProtection",
    subtitleKey: "qualityProtectorMaximumProtectionSubtitle"
  }
};

export function getQualityProtectorModeCopy(
  mode: AudioQualityProtectorMode,
  catalog: UiCatalog | null
): string {
  const definition = QUALITY_PROTECTOR_COPY[mode];
  return catalog ? translate(catalog, definition.labelKey) : mode;
}

export function getQualityProtectorButtonCopy(
  mode: AudioQualityProtectorMode,
  catalog: UiCatalog | null
): string {
  const copy = getQualityProtectorModeCopy(mode, catalog);
  return mode === "off" ? copy.toUpperCase() : copy;
}

export function getQualityProtectorSubtitleCopy(
  mode: AudioQualityProtectorMode,
  catalog: UiCatalog | null
): string {
  const definition = QUALITY_PROTECTOR_COPY[mode];
  return catalog ? translate(catalog, definition.subtitleKey) : definition.subtitleKey;
}
