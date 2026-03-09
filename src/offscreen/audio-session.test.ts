import {
  applyQualityProtector,
  buildDspRuntimeParameters,
  DEFAULT_ADVANCED_AUDIO_SETTINGS
} from "../shared/audio-settings";

const hoisted = vi.hoisted(() => ({
  faustNodeInstances: [] as unknown[],
  factoryLoader: vi.fn(async () => ({
    cfactory: 0,
    code: new Uint8Array([1, 2]),
    module: {} as WebAssembly.Module,
    json: '{"compile_options":"-single"}',
    poly: false,
    shaKey: "",
    soundfiles: {}
  }))
}));

vi.mock("@grame/faustwasm", () => {
  class FaustMonoAudioWorkletNode {
    readonly listeners = new Map<string, EventListener>();
    readonly connect = vi.fn();
    readonly disconnect = vi.fn();
    readonly addEventListener = vi.fn((name: string, listener: EventListener) => {
      this.listeners.set(name, listener);
    });
    readonly setParamValue = vi.fn();

    constructor(
      readonly audioContext: unknown,
      readonly options: unknown
    ) {
      hoisted.faustNodeInstances.push(this);
    }
  }

  return { FaustMonoAudioWorkletNode };
});

vi.mock("./faust-assets", () => ({
  MONO_FAUST_ASSET: {
    meta: { compile_options: "-single" },
    processorName: "mono",
    workletModulePath: "mono-worklet.js",
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
    loadFactory: hoisted.factoryLoader
  },
  selectFaustAsset: vi.fn(() => ({
    meta: { compile_options: "-single" },
    processorName: "mono",
    workletModulePath: "mono-worklet.js",
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
    loadFactory: hoisted.factoryLoader
  }))
}));

import { AudioSession } from "./audio-session";
import { selectFaustAsset } from "./faust-assets";

type MockFaustNode = {
  listeners: Map<string, EventListener>;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  setParamValue: ReturnType<typeof vi.fn>;
  options: unknown;
};

class FakeNode {
  readonly connect = vi.fn();
  readonly disconnect = vi.fn();
}

class FakeAudioParam {
  value = 0;
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
  readonly gain = new FakeAudioParam();
}

class FakeBiquadFilterNode extends FakeNode {
  type: BiquadFilterType = "lowpass";
  readonly frequency = new FakeAudioParam();
  readonly gain = new FakeAudioParam();
  readonly Q = new FakeAudioParam();
}

class FakeDynamicsCompressorNode extends FakeNode {
  readonly threshold = new FakeAudioParam();
  readonly knee = new FakeAudioParam();
  readonly ratio = new FakeAudioParam();
  readonly attack = new FakeAudioParam();
  readonly release = new FakeAudioParam();
}

class FakeWaveShaperNode extends FakeNode {
  curve: Float32Array | null = null;
}

class FakeAudioTrack {
  readonly stop = vi.fn();
  readonly getSettings = vi.fn(() => ({ channelCount: 1 }));
}

class FakeMediaStream {
  readonly track = new FakeAudioTrack();
  readonly getTracks = vi.fn(() => [this.track] as unknown as MediaStreamTrack[]);
  readonly getAudioTracks = vi.fn(() => [this.track] as unknown as MediaStreamTrack[]);
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];

  state: AudioContextState = "suspended";
  readonly destination = {};
  readonly audioWorklet = { addModule: vi.fn(async () => undefined) };
  readonly sourceNode = new FakeNode();
  readonly inputAnalyser = new FakeAnalyserNode();
  readonly outputAnalyser = new FakeAnalyserNode();
  readonly gainNodes: FakeGainNode[] = [];
  readonly biquadNodes: FakeBiquadFilterNode[] = [];
  readonly compressorNodes: FakeDynamicsCompressorNode[] = [];
  readonly waveShaperNodes: FakeWaveShaperNode[] = [];
  readonly createMediaStreamSource = vi.fn((_stream: MediaStream) => this.sourceNode as unknown as MediaStreamAudioSourceNode);
  readonly createAnalyser = vi
    .fn()
    .mockReturnValueOnce(this.inputAnalyser as unknown as AnalyserNode)
    .mockReturnValueOnce(this.outputAnalyser as unknown as AnalyserNode);
  readonly createGain = vi.fn(() => {
    const node = new FakeGainNode();
    this.gainNodes.push(node);
    return node as unknown as GainNode;
  });
  readonly createBiquadFilter = vi.fn(() => {
    const node = new FakeBiquadFilterNode();
    this.biquadNodes.push(node);
    return node as unknown as BiquadFilterNode;
  });
  readonly createDynamicsCompressor = vi.fn(() => {
    const node = new FakeDynamicsCompressorNode();
    this.compressorNodes.push(node);
    return node as unknown as DynamicsCompressorNode;
  });
  readonly createWaveShaper = vi.fn(() => {
    const node = new FakeWaveShaperNode();
    this.waveShaperNodes.push(node);
    return node as unknown as WaveShaperNode;
  });
  readonly resume = vi.fn(async () => {
    this.state = "running";
  });
  readonly close = vi.fn(async () => {
    this.state = "closed";
  });

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  static reset() {
    FakeAudioContext.instances.length = 0;
  }
}

describe("AudioSession", () => {
  const getUserMedia = vi.fn();
  const intervalCallbacks = new Map<number, () => void>();
  let nextIntervalId = 1;
  const windowSetInterval = vi.fn((handler: TimerHandler) => {
    const id = nextIntervalId++;

    if (typeof handler === "function") {
      intervalCallbacks.set(id, handler as () => void);
    }

    return id;
  });
  const windowClearInterval = vi.fn((id: number) => {
    intervalCallbacks.delete(id);
  });

  beforeEach(() => {
    FakeAudioContext.reset();
    hoisted.faustNodeInstances.length = 0;
    hoisted.factoryLoader.mockClear();
    getUserMedia.mockReset();
    windowSetInterval.mockClear();
    windowClearInterval.mockClear();
    intervalCallbacks.clear();
    nextIntervalId = 1;

    vi.stubGlobal("AudioContext", FakeAudioContext as unknown as typeof AudioContext);
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia
      }
    } as unknown as Navigator);
    vi.stubGlobal("window", {
      setInterval: windowSetInterval,
      clearInterval: windowClearInterval
    } as unknown as Window & typeof globalThis);
    vi.stubGlobal(
      "chrome",
      {
        runtime: {
          getURL: vi.fn((value: string) => `chrome-extension://test/${value}`)
        }
      } as unknown as typeof chrome
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("starts the tab capture audio graph and publishes telemetry", async () => {
    const stream = new FakeMediaStream();
    getUserMedia.mockResolvedValue(stream as unknown as MediaStream);
    const onTelemetry = vi.fn();
    const session = new AudioSession(240, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }, { onTelemetry });

    await session.start("stream-123");
    const context = FakeAudioContext.instances[0];
    const faustNode = hoisted.faustNodeInstances[0] as MockFaustNode;

    expect(getUserMedia).toHaveBeenCalledWith({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: "stream-123"
        }
      },
      video: false
    });
    expect(context.audioWorklet.addModule).toHaveBeenCalledWith(
      "chrome-extension://test/mono-worklet.js"
    );
    expect(context.resume).toHaveBeenCalledTimes(1);
    expect(windowSetInterval).toHaveBeenCalledTimes(1);
    expect(faustNode.setParamValue).toHaveBeenCalled();
    expect(faustNode.options).toEqual({
      processorOptions: {
        name: "mono",
        factory: await hoisted.factoryLoader.mock.results[0]?.value,
        sampleSize: 4
      }
    });

    context.inputAnalyser.peak = 0.76321;
    context.outputAnalyser.peak = 0.42123;
    (session as unknown as { emitCurrentTelemetry: () => void }).emitCurrentTelemetry();

    expect(onTelemetry).toHaveBeenLastCalledWith(
      expect.objectContaining({
        level: 0.4212,
        metrics: expect.objectContaining({
          inputPeak: 0.7632,
          outputPeak: 0.4212
        })
      })
    );
  });

  it("falls back to the native manual chain when Faust cannot boot", async () => {
    getUserMedia.mockResolvedValue(new FakeMediaStream() as unknown as MediaStream);
    hoisted.factoryLoader.mockRejectedValueOnce(new Error("Faust init failed"));
    const onFatalError = vi.fn();
    const session = new AudioSession(180, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }, { onTelemetry: vi.fn(), onFatalError });

    await session.start("stream-fallback-start");
    const context = FakeAudioContext.instances[0];

    expect((session as unknown as { engineStrategy: string }).engineStrategy).toBe("native_fallback");
    expect(context.createGain).toHaveBeenCalledTimes(3);
    expect(context.createBiquadFilter).toHaveBeenCalledTimes(2);
    expect(context.createDynamicsCompressor).toHaveBeenCalledTimes(1);
    expect(context.createWaveShaper).toHaveBeenCalledTimes(1);
    expect(windowSetInterval).toHaveBeenCalledTimes(2);
    expect(onFatalError).not.toHaveBeenCalled();
  });

  it("fails loudly when neither Faust nor the native fallback can initialize", async () => {
    class FailingFallbackAudioContext extends FakeAudioContext {
      override readonly createGain = vi.fn(() => {
        throw new Error("native fallback exploded");
      });
    }

    vi.stubGlobal("AudioContext", FailingFallbackAudioContext as unknown as typeof AudioContext);
    getUserMedia.mockResolvedValue(new FakeMediaStream() as unknown as MediaStream);
    hoisted.factoryLoader.mockRejectedValueOnce(new Error("Faust init failed"));
    const onTelemetry = vi.fn();
    const onFatalError = vi.fn();
    const session = new AudioSession(180, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }, { onTelemetry, onFatalError });

    await expect(session.start("stream-hard-fail")).rejects.toThrow(
      "The manual audio session could not initialize either Faust or the native fallback."
    );

    expect(onFatalError).toHaveBeenCalledWith({ key: "errorAudioPipelineStart" });
    expect(onTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 0,
        warning: "danger"
      })
    );
    expect(
      (
        session as unknown as {
          audioContext: AudioContext | null;
          sourceNode: MediaStreamAudioSourceNode | null;
          engineStrategy: string;
        }
      ).audioContext
    ).toBeNull();
    expect(
      (
        session as unknown as {
          audioContext: AudioContext | null;
          sourceNode: MediaStreamAudioSourceNode | null;
          engineStrategy: string;
        }
      ).sourceNode
    ).toBeNull();
    expect(
      (
        session as unknown as {
          audioContext: AudioContext | null;
          sourceNode: MediaStreamAudioSourceNode | null;
          engineStrategy: string;
        }
      ).engineStrategy
    ).toBe("faust");
  });

  it("periodically retries Faust while running on the native fallback and restores it when available", async () => {
    getUserMedia.mockResolvedValue(new FakeMediaStream() as unknown as MediaStream);
    hoisted.factoryLoader.mockRejectedValueOnce(new Error("Faust init failed"));
    const session = new AudioSession(180, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }, { onTelemetry: vi.fn() });

    await session.start("stream-fallback-recovery");

    expect((session as unknown as { engineStrategy: string }).engineStrategy).toBe("native_fallback");

    const recoveryCallback = [...intervalCallbacks.values()][0];
    recoveryCallback?.();
    await vi.waitFor(() => {
      expect((session as unknown as { engineStrategy: string }).engineStrategy).toBe("faust");
    });
    expect(hoisted.faustNodeInstances).toHaveLength(1);
    expect(windowClearInterval).toHaveBeenCalledWith(1);

    await session.stop();
  });

  it("reapplies params and emits new telemetry when gain changes", async () => {
    getUserMedia.mockResolvedValue(new FakeMediaStream() as unknown as MediaStream);
    const onTelemetry = vi.fn();
    const session = new AudioSession(180, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }, { onTelemetry });

    await session.start("stream-456");
    const faustNode = hoisted.faustNodeInstances[0] as MockFaustNode;

    faustNode.setParamValue.mockClear();
    onTelemetry.mockClear();

    session.setGainPercent(320);

    expect(faustNode.setParamValue).toHaveBeenCalled();
    expect(onTelemetry).toHaveBeenCalledTimes(1);
  });

  it("reapplies params and emits new telemetry when advanced settings change", async () => {
    getUserMedia.mockResolvedValue(new FakeMediaStream() as unknown as MediaStream);
    const onTelemetry = vi.fn();
    const session = new AudioSession(180, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }, { onTelemetry });

    await session.start("stream-advanced");
    const faustNode = hoisted.faustNodeInstances[0] as MockFaustNode;

    faustNode.setParamValue.mockClear();
    onTelemetry.mockClear();

    session.setAdvancedAudioSettings({
      ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
      qualityPreset: "maximum_clarity",
      softClipMix: 10
    });

    expect(faustNode.setParamValue).toHaveBeenCalled();
    expect(onTelemetry).toHaveBeenCalledTimes(1);
  });

  it("switches to the native fallback when the Faust processor errors", async () => {
    getUserMedia.mockResolvedValue(new FakeMediaStream() as unknown as MediaStream);
    const onTelemetry = vi.fn();
    const onFatalError = vi.fn();
    const session = new AudioSession(180, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }, { onTelemetry, onFatalError });

    await session.start("stream-789");
    const faustNode = hoisted.faustNodeInstances[0] as MockFaustNode;
    const processorErrorListener = faustNode.listeners.get("processorerror");

    processorErrorListener?.(new Event("processorerror"));

    expect(onTelemetry).toHaveBeenCalled();
    expect(onTelemetry).toHaveBeenLastCalledWith(
      expect.objectContaining({
        level: 0
      })
    );
    expect((session as unknown as { engineStrategy: string }).engineStrategy).toBe("native_fallback");
    expect(faustNode.disconnect).toHaveBeenCalled();
    expect(windowSetInterval).toHaveBeenCalledTimes(2);
    expect(onFatalError).not.toHaveBeenCalled();

    await session.stop();
  });

  it("stops the graph, tracks and interval cleanly", async () => {
    const stream = new FakeMediaStream();
    getUserMedia.mockResolvedValue(stream as unknown as MediaStream);
    const session = new AudioSession(180, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }, { onTelemetry: vi.fn() });

    await session.start("stream-stop");
    const context = FakeAudioContext.instances[0];

    await session.stop();

    expect(windowClearInterval).toHaveBeenCalledWith(expect.any(Number));
    expect(stream.track.stop).toHaveBeenCalledTimes(1);
    expect(context.sourceNode.disconnect).toHaveBeenCalledTimes(1);
    expect(context.close).toHaveBeenCalledTimes(1);
  });

  it("allows setters and meter guards to no-op before start", () => {
    const onTelemetry = vi.fn();
    const session = new AudioSession(180, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }, { onTelemetry });

    expect(() => session.setGainPercent(240)).not.toThrow();
    expect(() =>
      session.setAdvancedAudioSettings({
        ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
        softClipMix: 11
      })
    ).not.toThrow();
    expect(() => (session as unknown as { emitCurrentTelemetry: () => void }).emitCurrentTelemetry()).not.toThrow();
    expect(() => (session as unknown as { startMeter: () => void }).startMeter()).not.toThrow();

    expect(onTelemetry).not.toHaveBeenCalled();
    expect(windowSetInterval).not.toHaveBeenCalled();
  });

  it("stops safely before start and skips closing an already closed context", async () => {
    const session = new AudioSession(180, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }, { onTelemetry: vi.fn() });

    await expect(session.stop()).resolves.toBeUndefined();

    const startedSession = new AudioSession(180, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }, { onTelemetry: vi.fn() });
    getUserMedia.mockResolvedValue(new FakeMediaStream() as unknown as MediaStream);
    await startedSession.start("stream-closed");
    const context = FakeAudioContext.instances[0];
    context.state = "closed";
    context.close.mockClear();

    await startedSession.stop();

    expect(context.close).not.toHaveBeenCalled();
  });

  it("starts correctly even when the first audio track exposes no getSettings function", async () => {
    const streamWithoutTrackSettings = {
      getTracks: vi.fn(() => [] as unknown as MediaStreamTrack[]),
      getAudioTracks: vi.fn(
        () =>
          [
            {
              stop: vi.fn()
            }
          ] as unknown as MediaStreamTrack[]
      )
    } satisfies Partial<MediaStream>;
    getUserMedia.mockResolvedValue(streamWithoutTrackSettings as unknown as MediaStream);
    const session = new AudioSession(180, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }, { onTelemetry: vi.fn() });

    await session.start("stream-no-settings");

    expect(selectFaustAsset).toHaveBeenCalledWith(undefined);
  });

  it("samples telemetry through the live meter interval and tolerates empty audio-track arrays", async () => {
    const streamWithoutAudioTracks = {
      getTracks: vi.fn(
        () =>
          [
            {
              stop: vi.fn()
            }
          ] as unknown as MediaStreamTrack[]
      ),
      getAudioTracks: vi.fn(() => [] as unknown as MediaStreamTrack[])
    } satisfies Partial<MediaStream>;
    getUserMedia.mockResolvedValue(streamWithoutAudioTracks as unknown as MediaStream);
    const onTelemetry = vi.fn();
    const session = new AudioSession(180, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }, { onTelemetry });

    await session.start("stream-meter");

    expect(selectFaustAsset).toHaveBeenCalledWith(undefined);
    const context = FakeAudioContext.instances[0];
    context.inputAnalyser.peak = 0.8;
    context.outputAnalyser.peak = 0.35;
    const meterCallback = [...intervalCallbacks.values()].at(-1);
    meterCallback?.();

    expect(onTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 0.36,
        metrics: expect.objectContaining({
          inputPeak: 0.8,
          outputPeak: 0.35
        })
      })
    );
  });

  it("exposes deterministic helper math, analyser calibration, and native fallback graph wiring", async () => {
    const { __testables } = await import("./audio-session");
    const context = new FakeAudioContext();
    const analyser = __testables.createAnalyser(context as unknown as AudioContext) as unknown as FakeAnalyserNode;
    const fallbackGraph = __testables.createNativeFallbackGraph(
      context as unknown as AudioContext,
      context.inputAnalyser as unknown as AnalyserNode,
      context.outputAnalyser as unknown as AnalyserNode
    );
    const curve = __testables.createSoftClipCurve(12);
    const expectedDrive = 1 + 12 / 6;
    const middleX = (512 / (curve.length - 1)) * 2 - 1;

    expect(analyser.fftSize).toBe(1024);
    expect(analyser.smoothingTimeConstant).toBe(0.04);
    expect(__testables.getSampleSize({ compile_options: "-single" })).toBe(4);
    expect(__testables.getSampleSize({ compile_options: "-double -vec" })).toBe(8);
    analyser.peak = 0.43219;
    expect(__testables.readPeak(analyser as unknown as AnalyserNode)).toBe(0.4322);
    expect(__testables.roundTo(0.123456, 4)).toBe(0.1235);
    expect(__testables.dbToGain(-6)).toBeCloseTo(Math.pow(10, -6 / 20), 9);
    expect(__testables.clampNumber(-1, 0, 10)).toBe(0);
    expect(__testables.clampNumber(11, 0, 10)).toBe(10);
    expect(__testables.clampNumber(5, 0, 10)).toBe(5);
    expect(curve[0]).toBeCloseTo(Math.tanh(-1 * expectedDrive), 6);
    expect(curve[512]).toBeCloseTo(Math.tanh(middleX * expectedDrive), 6);
    expect(curve[curve.length - 1]).toBeCloseTo(Math.tanh(1 * expectedDrive), 6);

    expect(fallbackGraph.preGain).toBe(context.gainNodes[0]);
    expect(fallbackGraph.lowShelf).toBe(context.biquadNodes[0]);
    expect(fallbackGraph.midPeak).toBe(context.biquadNodes[1]);
    expect(fallbackGraph.compressor).toBe(context.compressorNodes[0]);
    expect(fallbackGraph.shaper).toBe(context.waveShaperNodes[0]);
    expect(fallbackGraph.wetGain).toBe(context.gainNodes[1]);
    expect(fallbackGraph.dryGain).toBe(context.gainNodes[2]);
    expect(context.inputAnalyser.connect).toHaveBeenNthCalledWith(1, context.gainNodes[0]);
    expect(context.inputAnalyser.connect).toHaveBeenNthCalledWith(2, context.gainNodes[2]);
    expect(context.outputAnalyser.connect).toHaveBeenCalledWith(context.gainNodes[1]);
    expect(fallbackGraph.wetGain.connect).toHaveBeenCalledWith(context.destination);
    expect(fallbackGraph.dryGain.connect).toHaveBeenCalledWith(context.destination);

    __testables.disconnectNativeFallbackGraph(fallbackGraph);
    expect(fallbackGraph.dryGain.disconnect).toHaveBeenCalledTimes(1);
    expect(fallbackGraph.wetGain.disconnect).toHaveBeenCalledTimes(1);
    expect(fallbackGraph.shaper.disconnect).toHaveBeenCalledTimes(1);
    expect(fallbackGraph.compressor.disconnect).toHaveBeenCalledTimes(1);
    expect(fallbackGraph.midPeak.disconnect).toHaveBeenCalledTimes(1);
    expect(fallbackGraph.lowShelf.disconnect).toHaveBeenCalledTimes(1);
    expect(fallbackGraph.preGain.disconnect).toHaveBeenCalledTimes(1);
    expect(() => __testables.disconnectNativeFallbackGraph(null)).not.toThrow();
  });

  it("applies the exact native fallback DSP parameters and clamped output shaping", async () => {
    const { __testables } = await import("./audio-session");
    const context = new FakeAudioContext();
    const fallbackGraph = __testables.createNativeFallbackGraph(
      context as unknown as AudioContext,
      context.inputAnalyser as unknown as AnalyserNode,
      context.outputAnalyser as unknown as AnalyserNode
    );
    const settings = {
      ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
      qualityPreset: "maximum_clarity" as const,
      outputCeilingDb: -1.2,
      lookaheadMs: 6,
      releaseMs: 220,
      multibandDepth: 35,
      softClipMix: 8
    };
    const runtime = applyQualityProtector(buildDspRuntimeParameters(5000, settings));

    __testables.applyNativeFallbackRuntimeParameters(fallbackGraph, runtime);

    expect(fallbackGraph.preGain.gain.value).toBeCloseTo(__testables.dbToGain(runtime.inputDriveDb), 9);
    expect(fallbackGraph.lowShelf.type).toBe("lowshelf");
    expect(fallbackGraph.lowShelf.frequency.value).toBe(180);
    expect(fallbackGraph.lowShelf.gain.value).toBeCloseTo(
      runtime.toneLowBandGainDb + runtime.lowBandTrimDb + runtime.lowBandMakeupDb,
      9
    );
    expect(fallbackGraph.midPeak.type).toBe("peaking");
    expect(fallbackGraph.midPeak.frequency.value).toBe(1700);
    expect(fallbackGraph.midPeak.Q.value).toBe(0.82);
    expect(fallbackGraph.midPeak.gain.value).toBeCloseTo(
      runtime.toneMidBandGainDb + runtime.clarityPresenceTiltDb - runtime.midHighThresholdOffsetDb * 0.08,
      9
    );
    expect(fallbackGraph.compressor.threshold.value).toBeCloseTo(
      __testables.clampNumber(-32 - runtime.multibandDepth * 0.14 + runtime.lowBandThresholdOffsetDb, -60, -6),
      9
    );
    expect(fallbackGraph.compressor.knee.value).toBeCloseTo(
      __testables.clampNumber(18 - runtime.lowBandRatioBias * 8, 0, 30),
      9
    );
    expect(fallbackGraph.compressor.ratio.value).toBeCloseTo(
      __testables.clampNumber(1.8 + runtime.multibandDepth * 0.11 + runtime.lowBandRatioBias * 2.4, 1, 20),
      9
    );
    expect(fallbackGraph.compressor.attack.value).toBeCloseTo(
      __testables.clampNumber(Math.max(runtime.lookaheadMs / 1000, 0.003), 0.003, 0.2),
      9
    );
    expect(fallbackGraph.compressor.release.value).toBeCloseTo(
      __testables.clampNumber(runtime.releaseMs / 1000, 0.06, 1.2),
      9
    );
    expect(fallbackGraph.shaper.curve?.length).toBe(1024);
    expect(fallbackGraph.shaper.curve?.[0]).toBeCloseTo(
      __testables.createSoftClipCurve(runtime.outputSoftClipMix)[0] ?? 0,
      6
    );
    expect(fallbackGraph.shaper.curve?.[1023]).toBeCloseTo(
      __testables.createSoftClipCurve(runtime.outputSoftClipMix)[1023] ?? 0,
      6
    );
    expect(fallbackGraph.wetGain.gain.value).toBeCloseTo(
      __testables.dbToGain(Math.min(0, runtime.outputCeilingDb)),
      9
    );
    expect(fallbackGraph.dryGain.gain.value).toBe(0);
  });

  it("keeps exact initial state, applies parameters to the active engine, and only reports fatal errors once", async () => {
    const onTelemetry = vi.fn();
    const onFatalError = vi.fn();
    const session = new AudioSession(180, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }, { onTelemetry, onFatalError });
    const internal = session as unknown as {
      fatalErrorNotified: boolean;
      faustRecoveryInFlight: boolean;
      engineStrategy: string;
      currentSettings: typeof DEFAULT_ADVANCED_AUDIO_SETTINGS;
      currentAsset: {
        controlPaths: Record<string, string>;
      };
      faustNode: MockFaustNode | null;
      fallbackGraph: ReturnType<(typeof session extends never ? never : typeof import("./audio-session")["__testables"]["createNativeFallbackGraph"])> | null;
      inputAnalyserNode: FakeAnalyserNode | null;
      outputAnalyserNode: FakeAnalyserNode | null;
      latestMetrics: ReturnType<typeof applyQualityProtector>;
      applyRuntimeParameters(): void;
      emitCurrentTelemetry(): void;
      startMeter(): void;
      handleFatalError(errorMessage: { key: string }): void;
    };

    expect(internal.fatalErrorNotified).toBe(false);
    expect(internal.faustRecoveryInFlight).toBe(false);
    expect(internal.engineStrategy).toBe("faust");

    const { __testables } = await import("./audio-session");
    const context = new FakeAudioContext();
    const fallbackGraph = __testables.createNativeFallbackGraph(
      context as unknown as AudioContext,
      context.inputAnalyser as unknown as AnalyserNode,
      context.outputAnalyser as unknown as AnalyserNode
    );
    const faustNode = {
      listeners: new Map<string, EventListener>(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      addEventListener: vi.fn(),
      setParamValue: vi.fn(),
      options: {}
    } as unknown as MockFaustNode;

    internal.currentAsset = {
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
      }
    };
    internal.fallbackGraph = fallbackGraph;
    internal.inputAnalyserNode = context.inputAnalyser;
    internal.outputAnalyserNode = null;
    internal.emitCurrentTelemetry();
    internal.startMeter();
    expect(onTelemetry).not.toHaveBeenCalled();
    expect(windowSetInterval).not.toHaveBeenCalled();

    internal.outputAnalyserNode = context.outputAnalyser;
    internal.faustNode = faustNode;
    internal.engineStrategy = "faust";
    internal.applyRuntimeParameters();
    expect(faustNode.setParamValue).toHaveBeenCalled();
    expect(fallbackGraph.preGain.gain.value).toBe(0);

    faustNode.setParamValue.mockClear();
    internal.faustNode = null;
    internal.applyRuntimeParameters();
    expect(faustNode.setParamValue).not.toHaveBeenCalled();
    expect(fallbackGraph.preGain.gain.value).not.toBe(0);

    internal.handleFatalError({ key: "errorAudioPipelineStart" });
    internal.handleFatalError({ key: "errorAudioPipelineStart" });
    expect(onFatalError).toHaveBeenCalledTimes(1);
    expect(onTelemetry).toHaveBeenCalledTimes(1);
    expect(onTelemetry).toHaveBeenLastCalledWith(
      expect.objectContaining({
        level: 0,
        warning: "danger"
      })
    );
    expect(internal.fatalErrorNotified).toBe(true);
  });

  it("keeps fatal handlers optional and resets exact runtime state after stop", async () => {
    getUserMedia.mockResolvedValue(new FakeMediaStream() as unknown as MediaStream);
    const session = new AudioSession(180, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }, { onTelemetry: vi.fn() });
    const internal = session as unknown as {
      latestMetrics: { clipEvents: number; protectionBypassed: boolean };
      fatalErrorNotified: boolean;
      faustRecoveryInFlight: boolean;
      engineStrategy: string;
      handleFatalError(errorMessage: { key: string }): void;
    };

    expect(() => internal.handleFatalError({ key: "errorAudioPipelineStart" })).not.toThrow();
    expect(internal.fatalErrorNotified).toBe(true);

    await session.start("stream-reset");
    internal.fatalErrorNotified = true;
    internal.faustRecoveryInFlight = true;
    internal.engineStrategy = "native_fallback";

    await session.stop();

    expect(internal.latestMetrics).toMatchObject({
      clipEvents: 0,
      protectionBypassed: false
    });
    expect(internal.fatalErrorNotified).toBe(false);
    expect(internal.faustRecoveryInFlight).toBe(false);
    expect(internal.engineStrategy).toBe("faust");
  });

  it("lets native fallback activation tolerate missing optional Faust and source nodes and no-op faust param writes", async () => {
    const session = new AudioSession(180, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }, { onTelemetry: vi.fn() });
    const internal = session as unknown as {
      engineStrategy: string;
      audioContext: FakeAudioContext | null;
      sourceNode: FakeNode | null;
      inputAnalyserNode: FakeAnalyserNode | null;
      outputAnalyserNode: FakeAnalyserNode | null;
      faustNode: MockFaustNode | null;
      fallbackGraph: unknown;
      currentAsset: {
        controlPaths: Record<string, string>;
      };
      activateNativeFallbackFromFaust(): void;
      applyFaustRuntimeParameters(runtime: ReturnType<typeof applyQualityProtector>): void;
    };
    const context = new FakeAudioContext();

    internal.engineStrategy = "faust";
    internal.audioContext = context;
    internal.sourceNode = null;
    internal.inputAnalyserNode = context.inputAnalyser;
    internal.outputAnalyserNode = context.outputAnalyser;
    internal.faustNode = null;
    internal.currentAsset = {
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
      }
    };

    expect(() =>
      internal.applyFaustRuntimeParameters(
        applyQualityProtector(buildDspRuntimeParameters(180, DEFAULT_ADVANCED_AUDIO_SETTINGS))
      )
    ).not.toThrow();

    internal.activateNativeFallbackFromFaust();

    expect(internal.engineStrategy).toBe("native_fallback");
    expect(internal.fallbackGraph).not.toBeNull();
  });

  it("guards fallback activation and recovery timers, and caches worklet modules per context", async () => {
    const { __testables } = await import("./audio-session");
    const session = new AudioSession(180, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }, { onTelemetry: vi.fn() });
    const internal = session as unknown as {
      engineStrategy: string;
      audioContext: FakeAudioContext | null;
      sourceNode: FakeNode | null;
      inputAnalyserNode: FakeAnalyserNode | null;
      outputAnalyserNode: FakeAnalyserNode | null;
      faustNode: MockFaustNode | null;
      fallbackGraph: ReturnType<(typeof import("./audio-session")["__testables"]["createNativeFallbackGraph"])> | null;
      faustRecoveryIntervalId: number | null;
      faustRecoveryInFlight: boolean;
      activateNativeFallbackFromFaust(): void;
      scheduleFaustRecovery(): void;
      cancelFaustRecovery(): void;
      attemptFaustRecovery(): Promise<void>;
    };
    const context = new FakeAudioContext();
    const faustNode = {
      listeners: new Map<string, EventListener>(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      addEventListener: vi.fn(),
      setParamValue: vi.fn(),
      options: {}
    } as unknown as MockFaustNode;

    internal.engineStrategy = "native_fallback";
    internal.activateNativeFallbackFromFaust();
    expect(internal.fallbackGraph).toBeNull();

    internal.engineStrategy = "faust";
    internal.audioContext = context;
    internal.sourceNode = context.sourceNode;
    internal.inputAnalyserNode = context.inputAnalyser;
    internal.outputAnalyserNode = context.outputAnalyser;
    internal.faustNode = faustNode;
    internal.activateNativeFallbackFromFaust();

    expect(internal.engineStrategy).toBe("native_fallback");
    expect(faustNode.disconnect).toHaveBeenCalledTimes(1);
    expect(context.sourceNode.disconnect).toHaveBeenCalledTimes(1);
    expect(context.sourceNode.connect).toHaveBeenCalledWith(context.inputAnalyser);
    expect(internal.fallbackGraph).not.toBeNull();

    internal.scheduleFaustRecovery();
    internal.scheduleFaustRecovery();
    expect(windowSetInterval).toHaveBeenCalledTimes(1);

    await internal.attemptFaustRecovery();
    expect(internal.engineStrategy).toBe("faust");
    expect(internal.faustRecoveryInFlight).toBe(false);

    internal.cancelFaustRecovery();
    expect(windowClearInterval).toHaveBeenCalled();
    expect(internal.faustRecoveryIntervalId).toBeNull();
    expect(internal.faustRecoveryInFlight).toBe(false);

    const ensureWorkletModule = AudioSession as unknown as {
      ensureWorkletModule(audioContext: BaseAudioContext, modulePath: string): Promise<void>;
    };
    const cacheContext = new FakeAudioContext() as unknown as BaseAudioContext;

    await ensureWorkletModule.ensureWorkletModule(cacheContext, "mono-worklet.js");
    await ensureWorkletModule.ensureWorkletModule(cacheContext, "mono-worklet.js");

    expect((cacheContext as unknown as FakeAudioContext).audioWorklet.addModule).toHaveBeenCalledTimes(1);
  });

  it("guards faust recovery while in flight and reports fatal errors when recovery cannot restore either engine", async () => {
    const onFatalError = vi.fn();
    const session = new AudioSession(180, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }, { onTelemetry: vi.fn(), onFatalError });
    const internal = session as unknown as {
      engineStrategy: string;
      audioContext: FakeAudioContext | null;
      inputAnalyserNode: FakeAnalyserNode | null;
      outputAnalyserNode: FakeAnalyserNode | null;
      faustRecoveryInFlight: boolean;
      currentAsset: ReturnType<typeof selectFaustAsset>;
      connectFaustGraph: ReturnType<typeof vi.fn>;
      activateNativeFallbackGraph: ReturnType<typeof vi.fn>;
      attemptFaustRecovery(): Promise<void>;
    };
    const context = new FakeAudioContext();
    let resolveRecovery: (() => void) | null = null;

    internal.engineStrategy = "native_fallback";
    internal.audioContext = context;
    internal.inputAnalyserNode = context.inputAnalyser;
    internal.outputAnalyserNode = context.outputAnalyser;
    internal.currentAsset = (selectFaustAsset as ReturnType<typeof vi.fn>).mock.results[0]?.value ?? (selectFaustAsset as unknown as () => ReturnType<typeof selectFaustAsset>)(1);
    internal.connectFaustGraph = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRecovery = resolve;
        })
    );

    const firstRecovery = internal.attemptFaustRecovery();
    expect(internal.faustRecoveryInFlight).toBe(true);

    await internal.attemptFaustRecovery();
    expect(internal.connectFaustGraph).toHaveBeenCalledTimes(1);

    resolveRecovery?.();
    await firstRecovery;
    expect(internal.faustRecoveryInFlight).toBe(false);
    expect(internal.engineStrategy).toBe("faust");

    internal.engineStrategy = "native_fallback";
    internal.connectFaustGraph = vi.fn(async () => {
      throw new Error("Faust recovery failed");
    });
    internal.activateNativeFallbackGraph = vi.fn(() => {
      throw new Error("Fallback recovery failed");
    });

    await internal.attemptFaustRecovery();

    expect(onFatalError).toHaveBeenCalledWith({ key: "errorAudioPipelineStart" });
    expect(internal.faustRecoveryInFlight).toBe(false);
  });
});
