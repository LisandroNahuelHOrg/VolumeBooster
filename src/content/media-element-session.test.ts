import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../shared/audio-settings";

const faustNodeInstances: MockFaustNode[] = [];
const mockFactoryLoader = vi.fn(async () => ({
  cfactory: 0,
  code: new Uint8Array([1, 2, 3]),
  module: {} as WebAssembly.Module,
  json: '{"compile_options":"-single"}',
  poly: false,
  shaKey: "",
  soundfiles: {}
}));

vi.mock("@grame/faustwasm", () => {
  class FaustMonoAudioWorkletNode {
    readonly paramValues = new Map<string, number>();
    readonly connect = vi.fn();
    readonly disconnect = vi.fn();
    readonly addEventListener = vi.fn();
    readonly setParamValue = vi.fn((path: string, value: number) => {
      this.paramValues.set(path, value);
    });

    constructor(
      readonly audioContext: unknown,
      readonly options: unknown
    ) {
      faustNodeInstances.push(this as unknown as MockFaustNode);
    }
  }

  return { FaustMonoAudioWorkletNode };
});

vi.mock("../offscreen/faust-assets", () => ({
  selectFaustAsset: vi.fn(() => ({
    meta: { compile_options: "-single" },
    processorName: "mock-processor",
    workletModulePath: "mock-worklet.js",
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
  }))
}));

import { selectFaustAsset } from "../offscreen/faust-assets";
import {
  MediaElementSession,
  MediaElementSessionError,
  hasPotentialMediaForAutomaticAttach,
  shouldAttemptAutomaticMediaAttach
} from "./media-element-session";

type MockFaustNode = {
  paramValues: Map<string, number>;
  options: unknown;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  setParamValue: ReturnType<typeof vi.fn>;
};

class FakeNode {
  readonly connect = vi.fn();
  readonly disconnect = vi.fn();
}

class FakeAnalyserNode extends FakeNode {
  fftSize = 0;
  smoothingTimeConstant = 0;
  peak = 0;
  readonly getFloatTimeDomainData = vi.fn((buffer: Float32Array) => {
    buffer.fill(0);
    buffer[0] = this.peak;
  });
}

class FakeGainNode extends FakeNode {
  gain = { value: 0 };
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  static nextState: AudioContextState = "running";
  static keepStateOnResume = false;
  static sourceError: Error | null = null;
  static resumeError: unknown | null = null;

  state: AudioContextState;
  readonly destination = {};
  readonly audioWorklet = {
    addModule: vi.fn(async () => undefined)
  };
  readonly sourceNode = new FakeNode();
  readonly inputAnalyser = new FakeAnalyserNode();
  readonly outputAnalyser = new FakeAnalyserNode();
  readonly wetGainNode = new FakeGainNode();
  readonly bypassGainNode = new FakeGainNode();
  readonly createMediaElementSource = vi.fn((_element: HTMLMediaElement) => {
    if (FakeAudioContext.sourceError) {
      throw FakeAudioContext.sourceError;
    }

    return this.sourceNode as unknown as MediaElementAudioSourceNode;
  });
  readonly createAnalyser = vi
    .fn()
    .mockReturnValueOnce(this.inputAnalyser as unknown as AnalyserNode)
    .mockReturnValueOnce(this.outputAnalyser as unknown as AnalyserNode);
  readonly createGain = vi
    .fn()
    .mockReturnValueOnce(this.wetGainNode as unknown as GainNode)
    .mockReturnValueOnce(this.bypassGainNode as unknown as GainNode);
  readonly resume = vi.fn(async () => {
    if (FakeAudioContext.resumeError) {
      throw FakeAudioContext.resumeError;
    }

    if (!FakeAudioContext.keepStateOnResume) {
      this.state = "running";
    }
  });
  readonly close = vi.fn(async () => {
    this.state = "closed";
  });

  constructor() {
    this.state = FakeAudioContext.nextState;
    FakeAudioContext.instances.push(this);
  }

  static reset() {
    FakeAudioContext.instances.length = 0;
    FakeAudioContext.nextState = "running";
    FakeAudioContext.keepStateOnResume = false;
    FakeAudioContext.sourceError = null;
    FakeAudioContext.resumeError = null;
  }
}

function makeMediaElement(overrides: Partial<HTMLMediaElement> = {}): HTMLMediaElement {
  return {
    currentSrc: "https://cdn.example.com/audio.mp4",
    srcObject: null,
    paused: false,
    ended: false,
    readyState: 2,
    currentTime: 1,
    played: { length: 1 } as TimeRanges,
    muted: false,
    defaultMuted: false,
    volume: 1,
    ...overrides
  } as HTMLMediaElement;
}

describe("MediaElementSession", () => {
  beforeEach(() => {
    faustNodeInstances.length = 0;
    mockFactoryLoader.mockClear();
    FakeAudioContext.reset();
    vi.stubGlobal("AudioContext", FakeAudioContext as unknown as typeof AudioContext);
    vi.stubGlobal(
      "chrome",
      {
        runtime: {
          getURL: vi.fn((value: string) => `chrome-extension://test/${value}`)
        }
      } as unknown as typeof chrome
    );
    vi.stubGlobal("navigator", {
      getAutoplayPolicy: vi.fn(() => "allowed"),
      userActivation: {
        hasBeenActive: true,
        isActive: true
      }
    } as unknown as Navigator);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("defers AudioContext creation when autoplay policy still disallows audible playback", async () => {
    vi.stubGlobal("navigator", {
      getAutoplayPolicy: vi.fn(() => "disallowed"),
      userActivation: {
        hasBeenActive: false,
        isActive: false
      }
    } as unknown as Navigator);

    await expect(
      MediaElementSession.create(makeMediaElement(), 200, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS })
    ).rejects.toMatchObject({
      reason: "autoplay_blocked",
      debugState: {
        audioContextState: "none",
        autoplayPolicy: "disallowed"
      },
      technicalMessage: expect.stringContaining("requires user gesture")
    });

    expect(FakeAudioContext.instances).toHaveLength(0);
  });

  it("allows creation without a recent gesture when the media autoplay policy explicitly allows it", async () => {
    vi.stubGlobal("navigator", {
      getAutoplayPolicy: vi.fn((target?: string | BaseAudioContext | HTMLMediaElement) => {
        if (target === "audiocontext") {
          return "allowed";
        }

        return "allowed-muted";
      }),
      userActivation: {
        hasBeenActive: false,
        isActive: false
      }
    } as unknown as Navigator);

    const session = await MediaElementSession.create(
      makeMediaElement(),
      200,
      { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
    );

    expect(session.getDebugState()).toEqual({
      audioContextState: "running",
      autoplayPolicy: "allowed-muted"
    });
    expect(FakeAudioContext.instances).toHaveLength(1);
  });

  it("blocks creation without a recent gesture when the media autoplay policy is unavailable", async () => {
    vi.stubGlobal("navigator", {
      userActivation: {
        hasBeenActive: false,
        isActive: false
      }
    } as unknown as Navigator);

    await expect(
      MediaElementSession.create(makeMediaElement(), 200, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS })
    ).rejects.toMatchObject({
      reason: "autoplay_blocked",
      debugState: {
        audioContextState: "none",
        autoplayPolicy: undefined
      }
    });
  });

  it("reports autoplay_blocked when AudioContext construction itself fails", async () => {
    vi.stubGlobal(
      "AudioContext",
      class ThrowingAudioContext {
        constructor() {
          throw new Error("construction denied");
        }
      } as unknown as typeof AudioContext
    );

    await expect(
      MediaElementSession.create(makeMediaElement(), 200, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS })
    ).rejects.toMatchObject({
      reason: "autoplay_blocked",
      technicalMessage: "AudioContext was not allowed to start. construction denied",
      debugState: {
        audioContextState: "none",
        autoplayPolicy: "allowed"
      }
    });
  });

  it("reports autoplay_blocked when resume leaves the context suspended", async () => {
    FakeAudioContext.nextState = "suspended";
    FakeAudioContext.keepStateOnResume = true;

    await expect(
      MediaElementSession.create(makeMediaElement(), 200, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS })
    ).rejects.toMatchObject({
      reason: "autoplay_blocked",
      technicalMessage: expect.stringContaining("suspended")
    });

    expect(FakeAudioContext.instances[0]?.close).toHaveBeenCalledTimes(1);
  });

  it("reports autoplay_blocked when the audio context autoplay policy is disallowed before resume", async () => {
    vi.stubGlobal("navigator", {
      getAutoplayPolicy: vi.fn((target?: string | BaseAudioContext | HTMLMediaElement) => {
        if (typeof target === "string") {
          return target === "audiocontext" ? "allowed" : "allowed";
        }

        return "disallowed";
      }),
      userActivation: {
        hasBeenActive: true,
        isActive: true
      }
    } as unknown as Navigator);

    await expect(
      MediaElementSession.create(makeMediaElement(), 200, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS })
    ).rejects.toMatchObject({
      reason: "autoplay_blocked",
      technicalMessage: "AudioContext autoplay policy is disallowed (disallowed).",
      debugState: {
        audioContextState: "closed",
        autoplayPolicy: "disallowed"
      }
    });

    expect(FakeAudioContext.instances[0]?.close).toHaveBeenCalledTimes(1);
  });

  it("reports autoplay_blocked when AudioContext.resume throws", async () => {
    FakeAudioContext.nextState = "suspended";
    FakeAudioContext.resumeError = new Error("resume denied");

    await expect(
      MediaElementSession.create(makeMediaElement(), 200, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS })
    ).rejects.toMatchObject({
      reason: "autoplay_blocked",
      technicalMessage: "AudioContext.resume() failed: resume denied",
      debugState: {
        audioContextState: "closed",
        autoplayPolicy: "allowed"
      }
    });

    expect(FakeAudioContext.instances[0]?.close).toHaveBeenCalledTimes(1);
  });

  it("reports source_conflict when the media element is already connected elsewhere", async () => {
    FakeAudioContext.sourceError = new Error("already connected");

    await expect(
      MediaElementSession.create(makeMediaElement(), 200, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS })
    ).rejects.toMatchObject({
      reason: "source_conflict",
      technicalMessage: "already connected"
    });
  });

  it("uses the fallback source_conflict message when the media element source throws a non-Error value", async () => {
    FakeAudioContext.sourceError = "already connected elsewhere" as unknown as Error;

    await expect(
      MediaElementSession.create(makeMediaElement(), 200, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS })
    ).rejects.toMatchObject({
      reason: "source_conflict",
      technicalMessage: "MediaElementAudioSourceNode could not be created."
    });
  });

  it("works without autoplay policy APIs and falls back to the string policy when context lookup throws", async () => {
    vi.stubGlobal("navigator", {
      userActivation: {
        hasBeenActive: true,
        isActive: true
      }
    } as unknown as Navigator);
    const firstSession = await MediaElementSession.create(
      makeMediaElement(),
      200,
      { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
    );

    expect(firstSession.getDebugState()).toEqual({
      audioContextState: "running",
      autoplayPolicy: undefined
    });

    const policySpy = vi.fn((target?: string | BaseAudioContext) => {
      if (target === "audiocontext") {
        return "allowed";
      }

      throw new Error("context lookup failed");
    });
    vi.stubGlobal("navigator", {
      getAutoplayPolicy: policySpy,
      userActivation: {
        hasBeenActive: true,
        isActive: true
      }
    } as unknown as Navigator);

    const secondSession = await MediaElementSession.create(
      makeMediaElement(),
      220,
      { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
    );

    expect(secondSession.getDebugState()).toEqual({
      audioContextState: "running",
      autoplayPolicy: "allowed"
    });
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
      userActivation: {
        hasBeenActive: true,
        isActive: true
      }
    } as unknown as Navigator);

    await MediaElementSession.create(makeMediaElement(), 200, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS });

    expect(faustNodeInstances.at(-1)?.options).toMatchObject({
      processorOptions: expect.objectContaining({
        sampleSize: 8
      })
    });
  });

  it("creates a processing session, applies runtime params and samples telemetry", async () => {
    const mediaElement = makeMediaElement();
    const session = await MediaElementSession.create(
      mediaElement,
      260,
      { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
    );
    const context = FakeAudioContext.instances[0];
    const faustNode = faustNodeInstances[0];

    expect(context.audioWorklet.addModule).toHaveBeenCalledWith(
      "chrome-extension://test/mock-worklet.js"
    );
    expect(mockFactoryLoader).toHaveBeenCalledTimes(1);
    expect(faustNode.setParamValue).toHaveBeenCalled();
    expect(context.wetGainNode.gain.value).toBe(1);
    expect(context.bypassGainNode.gain.value).toBe(0);
    expect(faustNode.options).toMatchObject({
      processorOptions: expect.objectContaining({
        sampleSize: 4
      })
    });

    context.inputAnalyser.peak = 0.8;
    context.outputAnalyser.peak = 0.42;
    const telemetry = session.sampleTelemetry();

    expect(telemetry).toMatchObject({
      level: 0.42,
      metrics: {
        inputPeak: 0.8,
        outputPeak: 0.42
      }
    });
    expect(session.isConnectedTo(mediaElement)).toBe(true);
    expect(session.isConnectedTo({} as HTMLMediaElement)).toBe(false);
  });

  it("reapplies settings and toggles wet/bypass output when processing state changes", async () => {
    const session = await MediaElementSession.create(
      makeMediaElement(),
      180,
      { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
    );
    const context = FakeAudioContext.instances[0];
    const faustNode = faustNodeInstances[0];
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

    const bypassTelemetry = session.sampleTelemetry();
    expect(bypassTelemetry.warning).toBe("none");
    expect(bypassTelemetry.metrics.protectionBypassed).toBe(true);

    session.setProcessingEnabled(true);
    expect(context.wetGainNode.gain.value).toBe(1);
    expect(context.bypassGainNode.gain.value).toBe(0);
  });

  it("resumes and stops the audio graph cleanly", async () => {
    const session = await MediaElementSession.create(
      makeMediaElement(),
      200,
      { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
    );
    const context = FakeAudioContext.instances[0];
    const resumed = await session.resumeProcessing();

    expect(resumed).toBe(true);

    await session.stop();

    expect(context.outputAnalyser.disconnect).toHaveBeenCalledTimes(1);
    expect(context.wetGainNode.disconnect).toHaveBeenCalledTimes(1);
    expect(context.bypassGainNode.disconnect).toHaveBeenCalledTimes(1);
    expect(context.sourceNode.disconnect).toHaveBeenCalledTimes(1);
    expect(context.close).toHaveBeenCalledTimes(1);
  });

  it("reuses loaded worklet modules and preserves closed contexts when stopping", async () => {
    const context = new FakeAudioContext();

    await (
      MediaElementSession as unknown as {
        ensureWorkletModule: (audioContext: BaseAudioContext, modulePath: string) => Promise<void>;
      }
    ).ensureWorkletModule(context as unknown as BaseAudioContext, "cached-worklet.js");
    await (
      MediaElementSession as unknown as {
        ensureWorkletModule: (audioContext: BaseAudioContext, modulePath: string) => Promise<void>;
      }
    ).ensureWorkletModule(context as unknown as BaseAudioContext, "cached-worklet.js");

    expect(context.audioWorklet.addModule).toHaveBeenCalledTimes(1);

    const session = await MediaElementSession.create(
      makeMediaElement(),
      200,
      { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
    );
    const createdContext = FakeAudioContext.instances.at(-1)!;
    createdContext.state = "closed";

    await session.stop();

    expect(createdContext.close).not.toHaveBeenCalled();
  });

  it("returns false when resumeProcessing cannot move the context back to running", async () => {
    const session = await MediaElementSession.create(
      makeMediaElement(),
      200,
      { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
    );
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

    await expect(
      MediaElementSession.create(makeMediaElement(), 200, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS })
    ).rejects.toMatchObject({
      reason: "attach_failed",
      technicalMessage: "Extension context invalidated."
    });
  });

  it("evaluates automatic attach eligibility across playback, gesture, and policy states", () => {
    const metadataReadyState = typeof HTMLMediaElement !== "undefined" ? HTMLMediaElement.HAVE_METADATA : 1;

    vi.stubGlobal("navigator", {
      getAutoplayPolicy: vi.fn(() => "allowed"),
      userActivation: {
        hasBeenActive: true,
        isActive: true
      }
    } as unknown as Navigator);

    expect(
      hasPotentialMediaForAutomaticAttach(
        makeMediaElement({
          readyState: metadataReadyState
        })
      )
    ).toBe(true);
    expect(
      hasPotentialMediaForAutomaticAttach(
        makeMediaElement({
          paused: true
        })
      )
    ).toBe(false);
    expect(
      hasPotentialMediaForAutomaticAttach(
        makeMediaElement({
          ended: true
        })
      )
    ).toBe(false);
    expect(
      hasPotentialMediaForAutomaticAttach(
        makeMediaElement({
          currentSrc: "",
          srcObject: null
        })
      )
    ).toBe(false);
    expect(
      hasPotentialMediaForAutomaticAttach(
        makeMediaElement({
          readyState: Math.max(0, metadataReadyState - 1)
        })
      )
    ).toBe(false);

    expect(shouldAttemptAutomaticMediaAttach(makeMediaElement())).toBe(true);

    vi.stubGlobal("navigator", {
      getAutoplayPolicy: vi.fn(() => "allowed"),
      userActivation: {
        hasBeenActive: false,
        isActive: false
      }
    } as unknown as Navigator);
    expect(shouldAttemptAutomaticMediaAttach(makeMediaElement())).toBe(true);

    vi.stubGlobal("navigator", {
      getAutoplayPolicy: vi.fn(() => "disallowed"),
      userActivation: {
        hasBeenActive: false,
        isActive: false
      }
    } as unknown as Navigator);
    expect(shouldAttemptAutomaticMediaAttach(makeMediaElement())).toBe(false);

    vi.stubGlobal("navigator", {
      userActivation: {
        hasBeenActive: false,
        isActive: false
      }
    } as unknown as Navigator);
    expect(shouldAttemptAutomaticMediaAttach(makeMediaElement())).toBe(false);

    vi.stubGlobal("navigator", {
      getAutoplayPolicy: vi.fn(() => "allowed"),
      userActivation: {
        hasBeenActive: true,
        isActive: true
      }
    } as unknown as Navigator);
    expect(
      shouldAttemptAutomaticMediaAttach(
        makeMediaElement({
          paused: true
        })
      )
    ).toBe(false);
  });

  it("returns an undefined autoplay hint when the policy api throws for both context and string lookups", async () => {
    const policySpy = vi.fn(() => {
      throw new Error("policy unavailable");
    });
    vi.stubGlobal("navigator", {
      getAutoplayPolicy: policySpy,
      userActivation: {
        hasBeenActive: true,
        isActive: true
      }
    } as unknown as Navigator);

    const session = await MediaElementSession.create(
      makeMediaElement(),
      200,
      { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
    );

    expect(session.getDebugState()).toEqual({
      audioContextState: "running",
      autoplayPolicy: undefined
    });
    expect(policySpy).toHaveBeenCalledWith("audiocontext");
  });
});
