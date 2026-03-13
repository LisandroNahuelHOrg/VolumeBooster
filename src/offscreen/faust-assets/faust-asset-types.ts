import type { FaustDspMeta, LooseFaustDspFactory } from "@grame/faustwasm";

export type DspControlKey =
  | "inputDriveDb"
  | "normalizationEnabled"
  | "normalizationGainDb"
  | "lookaheadMs"
  | "releaseMs"
  | "multibandDepth"
  | "protectorEnabled"
  | "outputLimiterEnabled"
  | "lowBandTrimDb"
  | "lowBandMakeupDb"
  | "lowBandThresholdOffsetDb"
  | "lowBandRatioBias"
  | "midHighThresholdOffsetDb"
  | "outputCeilingDb"
  | "outputSoftClipMix"
  | "clarityPresenceTiltDb"
  | "toneLowBandGainDb"
  | "toneMidBandGainDb";

export interface FaustAssetDescriptor {
  readonly meta: FaustDspMeta;
  readonly processorName: string;
  readonly workletModulePath: string;
  readonly controlPaths: Record<DspControlKey, string>;
  loadFactory(): Promise<Required<LooseFaustDspFactory>>;
}
