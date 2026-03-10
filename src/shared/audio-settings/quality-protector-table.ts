import type { AudioQualityProtectorMode } from "../types";

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
  warmth: {
    protectorEnabled: true,
    outputLimiterEnabled: true,
    lowBandTrimDb: -0.15,
    lowBandMakeupDb: 0.45,
    lowBandThresholdOffsetDb: 0.35,
    lowBandRatioBias: -0.04,
    midHighThresholdOffsetDb: 0.75,
    ceilingOffsetDb: -0.1,
    softClipMultiplier: 0.86,
    softClipAdd: 0.5,
    clarityPresenceTiltDb: -0.35
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
  vocal_focus: {
    protectorEnabled: true,
    outputLimiterEnabled: true,
    lowBandTrimDb: -1.25,
    lowBandMakeupDb: -0.05,
    lowBandThresholdOffsetDb: -2.1,
    lowBandRatioBias: 0.16,
    midHighThresholdOffsetDb: -0.45,
    ceilingOffsetDb: -0.14,
    softClipMultiplier: 0.78,
    softClipAdd: 0.2,
    clarityPresenceTiltDb: 1.15
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
  treble_safe: {
    protectorEnabled: true,
    outputLimiterEnabled: true,
    lowBandTrimDb: 0.1,
    lowBandMakeupDb: 0.15,
    lowBandThresholdOffsetDb: -0.3,
    lowBandRatioBias: 0.12,
    midHighThresholdOffsetDb: 1.2,
    ceilingOffsetDb: -0.22,
    softClipMultiplier: 1.04,
    softClipAdd: 1.6,
    clarityPresenceTiltDb: -0.7
  },
  punch_preserve: {
    protectorEnabled: true,
    outputLimiterEnabled: true,
    lowBandTrimDb: 0.2,
    lowBandMakeupDb: 0.55,
    lowBandThresholdOffsetDb: 0.9,
    lowBandRatioBias: -0.22,
    midHighThresholdOffsetDb: -0.3,
    ceilingOffsetDb: -0.09,
    softClipMultiplier: 0.82,
    softClipAdd: 0.35,
    clarityPresenceTiltDb: 0.3
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
