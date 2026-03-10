import type { DspRuntimeParameters } from "./contracts";
import { MAX_OUTPUT_SOFT_CLIP_MIX } from "./limits";
import { clamp } from "./internal/clamp";
import { getQualityProtectorDefinition } from "./internal/get-quality-protector-definition";
import { roundTo } from "./internal/round-to";

/** Applies the selected quality-protector mode on top of a runtime DSP state. */
export function applyQualityProtector(runtime: DspRuntimeParameters): DspRuntimeParameters {
  const protector = getQualityProtectorDefinition(runtime.qualityProtectorMode);

  return {
    ...runtime,
    protectorEnabled: protector.protectorEnabled,
    outputLimiterEnabled: protector.outputLimiterEnabled,
    lowBandTrimDb: protector.lowBandTrimDb,
    lowBandMakeupDb: protector.lowBandMakeupDb,
    lowBandThresholdOffsetDb: protector.lowBandThresholdOffsetDb,
    lowBandRatioBias: protector.lowBandRatioBias,
    midHighThresholdOffsetDb: protector.midHighThresholdOffsetDb,
    outputCeilingDb: roundTo(runtime.outputCeilingDb + protector.ceilingOffsetDb, 2),
    outputSoftClipMix: protector.outputLimiterEnabled
      ? roundTo(
          clamp(
            runtime.outputSoftClipMix * protector.softClipMultiplier + protector.softClipAdd,
            0,
            MAX_OUTPUT_SOFT_CLIP_MIX
          ),
          2
        )
      : 0,
    clarityPresenceTiltDb: protector.clarityPresenceTiltDb
  };
}
