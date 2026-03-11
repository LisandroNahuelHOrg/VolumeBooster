import {
  DEFAULT_ADVANCED_AUDIO_SETTINGS,
  applyQualityPreset
} from "../../../shared/audio-settings";
import { MediaElementSession, MediaElementSessionError } from "../../media-element-session";
import { createMediaElementSessionTestHarness } from "./create-media-element-session-test-harness";
import { faustNodeInstances } from "./faust-node-mock";
import { FakeAudioContext } from "./fake-audio-context";
import { makeMediaElement } from "./make-media-element";

export function registerRuntimeAndTelemetryTests(): void {
  describe("MediaElementSession runtime and telemetry", () => {
    beforeEach(() => {
      createMediaElementSessionTestHarness();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    it("creates a processing session, applies runtime params and samples telemetry", async () => {
      const mediaElement = makeMediaElement();
      const session = await MediaElementSession.create(mediaElement, 260, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS });
      const context = FakeAudioContext.instances[0]!;
      const faustNode = faustNodeInstances[0]!;

      expect(context.audioWorklet.addModule).toHaveBeenCalledWith("chrome-extension://test/mock-worklet.js");
      expect(faustNode.setParamValue).toHaveBeenCalled();
      expect(context.wetGainNode.gain.value).toBe(1);
      expect(context.bypassGainNode.gain.value).toBe(0);
      expect(faustNode.options).toMatchObject({ processorOptions: expect.objectContaining({ sampleSize: 4 }) });

      context.inputAnalyser.peak = 0.8;
      context.outputAnalyser.peak = 0.42;
      const telemetry = session.sampleTelemetry();

      expect(telemetry).toMatchObject({
        level: 0.42,
        metrics: { inputPeak: 0.8, outputPeak: 0.42 }
      });
      expect(session.isConnectedTo(mediaElement)).toBe(true);
      expect(session.isConnectedTo({} as HTMLMediaElement)).toBe(false);
    });

    it("reapplies settings and toggles wet and bypass output when processing changes", async () => {
      const session = await MediaElementSession.create(makeMediaElement(), 180, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS });
      const context = FakeAudioContext.instances[0]!;
      const faustNode = faustNodeInstances[0]!;
      const baselineDrive = faustNode.paramValues.get("inputDriveDb");

      faustNode.setParamValue.mockClear();
      session.setGainPercent(320);
      expect(faustNode.paramValues.get("inputDriveDb")).not.toBe(baselineDrive);
      session.setAdvancedAudioSettings({
        ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
        qualityProtectorMode: "off",
        qualityPreset: "bass_boost"
      });
      expect(faustNode.paramValues.get("protectorEnabled")).toBe(0);
      expect(faustNode.paramValues.get("toneLowBandGainDb")).toBeGreaterThan(0);
      session.setProcessingEnabled(false);

      expect(faustNode.setParamValue).toHaveBeenCalled();
      expect(context.wetGainNode.gain.value).toBe(0);
      expect(context.bypassGainNode.gain.value).toBe(1);
      expect(session.sampleTelemetry()).toMatchObject({
        warning: "none",
        metrics: { protectionBypassed: true }
      });

      session.setProcessingEnabled(true);
      expect(context.wetGainNode.gain.value).toBe(1);
      expect(context.bypassGainNode.gain.value).toBe(0);
    });

    it("returns false when resumeProcessing cannot move the context back to running", async () => {
      const session = await MediaElementSession.create(makeMediaElement(), 200, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS });
      const context = FakeAudioContext.instances.at(-1)!;
      context.state = "suspended";
      FakeAudioContext.keepStateOnResume = true;

      await expect(session.resumeProcessing()).resolves.toBe(false);
    });

    it("creates a typed session error for consumer-facing failures", () => {
      const error = new MediaElementSessionError("attach_failed", "boom", {
        audioContextState: "running",
        autoplayPolicy: "allowed"
      });

      expect(error.name).toBe("MediaElementSessionError");
      expect(error.reason).toBe("attach_failed");
      expect(error.debugState?.autoplayPolicy).toBe("allowed");
      expect(applyQualityPreset("maximum_loudness").qualityPreset).toBe("maximum_loudness");
    });
  });
}
