import type { QualityPreset } from "../types";

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
  vocal_presence: {
    inputDriveMaxDb: 12.5,
    ceilingDb: -1.1,
    lookaheadMs: 5.4,
    releaseMs: 185,
    multibandDepth: 39,
    softClipMix: 10,
    toneLowBandGainDb: -0.7,
    toneMidBandGainDb: 1.4
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
  smooth_bright: {
    inputDriveMaxDb: 11.8,
    ceilingDb: -1.25,
    lookaheadMs: 6.8,
    releaseMs: 210,
    multibandDepth: 33,
    softClipMix: 7,
    toneLowBandGainDb: -0.2,
    toneMidBandGainDb: 0.95
  },
  warm_cinematic: {
    inputDriveMaxDb: 13.2,
    ceilingDb: -1.15,
    lookaheadMs: 6.6,
    releaseMs: 245,
    multibandDepth: 42,
    softClipMix: 11,
    toneLowBandGainDb: 1.4,
    toneMidBandGainDb: -0.25
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
  },
  punch_drive: {
    inputDriveMaxDb: 15.8,
    ceilingDb: -0.95,
    lookaheadMs: 3.6,
    releaseMs: 145,
    multibandDepth: 49,
    softClipMix: 16,
    toneLowBandGainDb: 1.1,
    toneMidBandGainDb: 0.55
  }
};
