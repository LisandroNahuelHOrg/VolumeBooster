import type { AudioQualityProtectorMode } from "../types";

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
