import type { AdvancedAudioSettings } from "../../../shared/types";

export type AdvancedControlKey = keyof Pick<
  AdvancedAudioSettings,
  "ceilingDb" | "lookaheadMs" | "releaseMs" | "multibandDepth" | "softClipMix"
>;

export const ADVANCED_CONTROL_CONFIG: Record<
  AdvancedControlKey,
  {
    min: number;
    max: number;
    step: number;
    labelKey: string;
    helpLabelKey: string;
    helpTextKey: string;
  }
> = {
  ceilingDb: {
    min: -2,
    max: -0.3,
    step: 0.01,
    labelKey: "ceilingLabel",
    helpLabelKey: "ceilingHelpLabel",
    helpTextKey: "ceilingHelpText"
  },
  lookaheadMs: {
    min: 1,
    max: 8,
    step: 0.1,
    labelKey: "lookaheadLabel",
    helpLabelKey: "lookaheadHelpLabel",
    helpTextKey: "lookaheadHelpText"
  },
  releaseMs: {
    min: 60,
    max: 350,
    step: 1,
    labelKey: "releaseLabel",
    helpLabelKey: "releaseHelpLabel",
    helpTextKey: "releaseHelpText"
  },
  multibandDepth: {
    min: 0,
    max: 100,
    step: 1,
    labelKey: "multibandDepthLabel",
    helpLabelKey: "multibandDepthHelpLabel",
    helpTextKey: "multibandDepthHelpText"
  },
  softClipMix: {
    min: 0,
    max: 40,
    step: 0.1,
    labelKey: "softClipMixLabel",
    helpLabelKey: "softClipMixHelpLabel",
    helpTextKey: "softClipMixHelpText"
  }
};
