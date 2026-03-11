import { selectFaustAsset } from "../../../offscreen/faust-assets";
import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../../../shared/audio-settings";
import { MediaElementSession } from "../../media-element-session";
import { ensureMediaWorkletModule } from "../ensure-media-worklet-module";
import { createMediaElementSessionTestHarness } from "./create-media-element-session-test-harness";
import {
  faustNodeInstances,
  mockFactoryLoader
} from "./faust-node-mock";
import { FakeAudioContext } from "./fake-audio-context";
import { makeMediaElement } from "./make-media-element";

export function registerLifecycleAndWorkletTests(): void {
  describe("MediaElementSession lifecycle and worklet behavior", () => {
    beforeEach(() => {
      createMediaElementSessionTestHarness();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    it("works without autoplay policy APIs and falls back to string policy when context lookup throws", async () => {
      vi.stubGlobal("navigator", { userActivation: { hasBeenActive: true, isActive: true } } as unknown as Navigator);
      const firstSession = await MediaElementSession.create(makeMediaElement(), 200, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS });

      expect(firstSession.getDebugState()).toEqual({ audioContextState: "running", autoplayPolicy: undefined });

      const policySpy = vi.fn((target?: string | BaseAudioContext) => {
        if (target === "audiocontext") {
          return "allowed";
        }

        throw new Error("context lookup failed");
      });

      vi.stubGlobal("navigator", {
        getAutoplayPolicy: policySpy,
        userActivation: { hasBeenActive: true, isActive: true }
      } as unknown as Navigator);

      const secondSession = await MediaElementSession.create(makeMediaElement(), 220, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS });
      expect(secondSession.getDebugState()).toEqual({ audioContextState: "running", autoplayPolicy: "allowed" });
      expect(policySpy).toHaveBeenCalledWith(FakeAudioContext.instances.at(-1));
      expect(policySpy).toHaveBeenCalledWith("audiocontext");
    });

    it("ignores autoplay hint failures and supports double-precision assets", async () => {
      vi.mocked(selectFaustAsset).mockReturnValueOnce({
        meta: { compile_options: "-double" },
        processorName: "double-processor",
        workletModulePath: "double-worklet.js",
        controlPaths: {
          inputDriveDb: "inputDriveDb",
          lookaheadMs: "lookaheadMs",
          releaseMs: "releaseMs",
          multibandDepth: "multibandDepth",
          protectorEnabled: "protectorEnabled",
          outputLimiterEnabled: "outputLimiterEnabled",
          lowBandTrimDb: "lowBandTrimDb",
          lowBandMakeupDb: "lowBandMakeupDb",
          lowBandThresholdOffsetDb: "lowBandThresholdOffsetDb",
          lowBandRatioBias: "lowBandRatioBias",
          midHighThresholdOffsetDb: "midHighThresholdOffsetDb",
          outputCeilingDb: "outputCeilingDb",
          outputSoftClipMix: "outputSoftClipMix",
          clarityPresenceTiltDb: "clarityPresenceTiltDb",
          toneLowBandGainDb: "toneLowBandGainDb",
          toneMidBandGainDb: "toneMidBandGainDb"
        },
        loadFactory: mockFactoryLoader
      } as never);
      vi.stubGlobal("navigator", {
        getAutoplayPolicy: vi.fn((target?: string | BaseAudioContext) => {
          if (target === "audiocontext") {
            throw new Error("policy hint unavailable");
          }

          return "allowed";
        }),
        userActivation: { hasBeenActive: true, isActive: true }
      } as unknown as Navigator);

      await MediaElementSession.create(makeMediaElement(), 200, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS });
      expect(faustNodeInstances.at(-1)?.options).toMatchObject({
        processorOptions: expect.objectContaining({ sampleSize: 8 })
      });
    });

    it("resumes and stops the audio graph cleanly", async () => {
      const session = await MediaElementSession.create(makeMediaElement(), 200, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS });
      const context = FakeAudioContext.instances[0]!;

      await expect(session.resumeProcessing()).resolves.toBe(true);
      await session.stop();

      expect(context.outputAnalyser.disconnect).toHaveBeenCalledTimes(1);
      expect(context.wetGainNode.disconnect).toHaveBeenCalledTimes(1);
      expect(context.bypassGainNode.disconnect).toHaveBeenCalledTimes(1);
      expect(context.sourceNode.disconnect).toHaveBeenCalledTimes(1);
      expect(context.close).toHaveBeenCalledTimes(1);
    });

    it("reuses loaded worklet modules and preserves closed contexts when stopping", async () => {
      const context = new FakeAudioContext();

      await ensureMediaWorkletModule(context as unknown as BaseAudioContext, "cached-worklet.js");
      await ensureMediaWorkletModule(context as unknown as BaseAudioContext, "cached-worklet.js");
      expect(context.audioWorklet.addModule).toHaveBeenCalledTimes(1);

      const session = await MediaElementSession.create(makeMediaElement(), 200, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS });
      const createdContext = FakeAudioContext.instances.at(-1)!;
      createdContext.state = "closed";

      await session.stop();
      expect(createdContext.close).not.toHaveBeenCalled();
    });

    it("fails loudly when the worklet runtime url is unavailable", async () => {
      vi.stubGlobal(
        "chrome",
        {
          runtime: {
            getURL: vi.fn(() => {
              throw new Error("extension context invalidated");
            })
          }
        } as unknown as typeof chrome
      );

      await expect(MediaElementSession.create(makeMediaElement(), 200, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS })).rejects
        .toMatchObject({
          reason: "attach_failed",
          technicalMessage: "Extension context invalidated."
        });
    });
  });
}
