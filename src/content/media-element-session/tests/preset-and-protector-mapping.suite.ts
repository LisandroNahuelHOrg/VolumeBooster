import {
  DEFAULT_ADVANCED_AUDIO_SETTINGS,
  applyQualityPreset,
  applyQualityProtector,
  buildDspRuntimeParameters
} from "../../../shared/audio-settings";
import { MediaElementSession } from "../../media-element-session";
import { createMediaElementSessionTestHarness } from "./create-media-element-session-test-harness";
import { faustNodeInstances } from "./faust-node-mock";
import { makeMediaElement } from "./make-media-element";

export function registerPresetAndProtectorMappingTests(): void {
  describe("MediaElementSession preset and protector mapping", () => {
    beforeEach(() => {
      createMediaElementSessionTestHarness();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    it.each(["vocal_presence", "smooth_bright", "warm_cinematic", "punch_drive"] as const)(
      "routes the %s sound preset into the Faust runtime exactly",
      async (preset) => {
        const settings = applyQualityPreset(preset);
        const expectedRuntime = applyQualityProtector(buildDspRuntimeParameters(260, settings));

        await MediaElementSession.create(makeMediaElement(), 260, settings);
        const faustNode = faustNodeInstances.at(-1)!;

        expect(faustNode.paramValues.get("inputDriveDb")).toBe(expectedRuntime.inputDriveDb);
        expect(faustNode.paramValues.get("lookaheadMs")).toBe(expectedRuntime.lookaheadMs);
        expect(faustNode.paramValues.get("releaseMs")).toBe(expectedRuntime.releaseMs);
        expect(faustNode.paramValues.get("multibandDepth")).toBe(expectedRuntime.multibandDepth);
        expect(faustNode.paramValues.get("outputCeilingDb")).toBe(expectedRuntime.outputCeilingDb);
        expect(faustNode.paramValues.get("outputSoftClipMix")).toBe(expectedRuntime.outputSoftClipMix);
        expect(faustNode.paramValues.get("toneLowBandGainDb")).toBe(expectedRuntime.toneLowBandGainDb);
        expect(faustNode.paramValues.get("toneMidBandGainDb")).toBe(expectedRuntime.toneMidBandGainDb);
      }
    );

    it.each(["warmth", "vocal_focus", "treble_safe", "punch_preserve"] as const)(
      "routes the %s protector profile into the Faust runtime exactly",
      async (mode) => {
        const settings = { ...DEFAULT_ADVANCED_AUDIO_SETTINGS, qualityProtectorMode: mode };
        const expectedRuntime = applyQualityProtector(buildDspRuntimeParameters(260, settings));

        await MediaElementSession.create(makeMediaElement(), 260, settings);
        const faustNode = faustNodeInstances.at(-1)!;

        expect(faustNode.paramValues.get("protectorEnabled")).toBe(1);
        expect(faustNode.paramValues.get("outputLimiterEnabled")).toBe(1);
        expect(faustNode.paramValues.get("lowBandTrimDb")).toBe(expectedRuntime.lowBandTrimDb);
        expect(faustNode.paramValues.get("lowBandMakeupDb")).toBe(expectedRuntime.lowBandMakeupDb);
        expect(faustNode.paramValues.get("lowBandThresholdOffsetDb")).toBe(expectedRuntime.lowBandThresholdOffsetDb);
        expect(faustNode.paramValues.get("lowBandRatioBias")).toBe(expectedRuntime.lowBandRatioBias);
        expect(faustNode.paramValues.get("midHighThresholdOffsetDb")).toBe(expectedRuntime.midHighThresholdOffsetDb);
        expect(faustNode.paramValues.get("outputCeilingDb")).toBe(expectedRuntime.outputCeilingDb);
        expect(faustNode.paramValues.get("outputSoftClipMix")).toBe(expectedRuntime.outputSoftClipMix);
        expect(faustNode.paramValues.get("clarityPresenceTiltDb")).toBe(expectedRuntime.clarityPresenceTiltDb);
      }
    );
  });
}
