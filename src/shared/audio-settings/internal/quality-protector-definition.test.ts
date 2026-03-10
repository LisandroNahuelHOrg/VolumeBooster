import { getQualityProtectorDefinition } from "./get-quality-protector-definition";
import { isProtectionBypassedMode } from "./is-protection-bypassed-mode";

describe("audio-settings/internal protector definitions", () => {
  it("exposes the exact static protector tables used by the popup", () => {
    expect(getQualityProtectorDefinition("balanced")).toEqual({
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
    });

    expect(getQualityProtectorDefinition("clarity")).toEqual({
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
    });

    expect(getQualityProtectorDefinition("warmth")).toEqual({
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
    });

    expect(getQualityProtectorDefinition("vocal_focus")).toEqual({
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
    });

    expect(getQualityProtectorDefinition("treble_safe")).toEqual({
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
    });

    expect(getQualityProtectorDefinition("punch_preserve")).toEqual({
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
    });

    expect(getQualityProtectorDefinition("maximum_protection")).toEqual({
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
    });
  });

  it("exposes helper-level protector metadata and bypass state", () => {
    expect(getQualityProtectorDefinition("clarity").clarityPresenceTiltDb).toBeGreaterThan(0);
    expect(isProtectionBypassedMode("off")).toBe(true);
  });
});
