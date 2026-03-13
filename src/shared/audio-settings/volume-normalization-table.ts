import type { VolumeNormalizationMode } from "../types";

export interface VolumeNormalizationDefinition {
  maxBoostDb: number;
  maxCutDb: number;
  attackMs: number;
  releaseMs: number;
  fullScaleWindowDb: number;
}

export const VOLUME_NORMALIZATION_TABLE: Record<
  Exclude<VolumeNormalizationMode, "off">,
  VolumeNormalizationDefinition
> = {
  balanced: {
    maxBoostDb: 9,
    maxCutDb: 6,
    attackMs: 160,
    releaseMs: 420,
    fullScaleWindowDb: 12
  },
  speech: {
    maxBoostDb: 12,
    maxCutDb: 5,
    attackMs: 120,
    releaseMs: 320,
    fullScaleWindowDb: 14
  },
  aggressive: {
    maxBoostDb: 15,
    maxCutDb: 8,
    attackMs: 90,
    releaseMs: 260,
    fullScaleWindowDb: 18
  }
};
