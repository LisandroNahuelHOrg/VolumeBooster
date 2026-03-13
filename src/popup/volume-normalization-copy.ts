import type { I18nKey } from "../generated/i18n-types";
import { translate, type UiCatalog } from "../shared/runtime-i18n";
import type { VolumeNormalizationMode } from "../shared/types";

interface VolumeNormalizationCopyDefinition {
  labelKey: I18nKey;
  subtitleKey: I18nKey;
}

export const VOLUME_NORMALIZATION_COPY: Record<
  VolumeNormalizationMode,
  VolumeNormalizationCopyDefinition
> = {
  off: {
    labelKey: "volumeNormalizationOff",
    subtitleKey: "volumeNormalizationOffSubtitle"
  },
  balanced: {
    labelKey: "volumeNormalizationBalanced",
    subtitleKey: "volumeNormalizationBalancedSubtitle"
  },
  speech: {
    labelKey: "volumeNormalizationSpeech",
    subtitleKey: "volumeNormalizationSpeechSubtitle"
  },
  aggressive: {
    labelKey: "volumeNormalizationAggressive",
    subtitleKey: "volumeNormalizationAggressiveSubtitle"
  }
};

export function getVolumeNormalizationModeCopy(
  mode: VolumeNormalizationMode,
  catalog: UiCatalog | null
): string {
  const definition = VOLUME_NORMALIZATION_COPY[mode];
  return catalog ? translate(catalog, definition.labelKey) : mode;
}

export function getVolumeNormalizationButtonCopy(
  mode: VolumeNormalizationMode,
  catalog: UiCatalog | null
): string {
  const copy = getVolumeNormalizationModeCopy(mode, catalog);
  return mode === "off" ? copy.toUpperCase() : copy;
}

export function getVolumeNormalizationSubtitleCopy(
  mode: VolumeNormalizationMode,
  catalog: UiCatalog | null
): string {
  const definition = VOLUME_NORMALIZATION_COPY[mode];
  return catalog ? translate(catalog, definition.subtitleKey) : definition.subtitleKey;
}
