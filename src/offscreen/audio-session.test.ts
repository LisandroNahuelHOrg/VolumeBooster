import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  applyQualityProtector,
  buildDspRuntimeParameters,
  DEFAULT_ADVANCED_AUDIO_SETTINGS,
  type DspRuntimeParameters
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

type AudioSessionTestFallbackGraph = {
  preGain: GainNode;
  lowShelf: BiquadFilterNode;
  midPeak: BiquadFilterNode;
  compressor: DynamicsCompressorNode;
  shaper: WaveShaperNode;
  wetGain: GainNode;
  dryGain: GainNode;
};

type AudioSessionTestState = {
  audioContext: FakeAudioContext | null;
  currentAsset: ReturnType<typeof selectFaustAsset>;
  currentSettings: typeof DEFAULT_ADVANCED_AUDIO_SETTINGS;
  engineStrategy: string;
  fatalErrorNotified: boolean;
  faustNode: MockFaustNode | null;
  faustRecoveryInFlight: boolean;
  faustRecoveryIntervalId: number | null;
  fallbackGraph: AudioSessionTestFallbackGraph | null;
  inputAnalyserNode: FakeAnalyserNode | null;
  latestMetrics: Record<string, unknown>;
  meterIntervalId: number | null;
  outputAnalyserNode: FakeAnalyserNode | null;
  sourceNode: FakeNode | null;
  stream: FakeMediaStream | null;
};

type AudioSessionRecoveryDependencies = {
  activateNativeFallbackGraph?: (
    state: AudioSessionTestState,
    audioContext: AudioContext,
    inputAnalyserNode: AnalyserNode,
    outputAnalyserNode: AnalyserNode
  ) => void;
  connectFaustGraph?: (
    state: AudioSessionTestState,
    audioContext: AudioContext,
    inputAnalyserNode: AnalyserNode,
    outputAnalyserNode: AnalyserNode,
    asset: ReturnType<typeof selectFaustAsset>
  ) => Promise<void>;
};

type AudioSessionTestables = {
  activateNativeFallbackFromFaust(state: AudioSessionTestState): void;
  applyAudioSessionRuntimeParameters(state: AudioSessionTestState): void;
  applyFaustRuntimeParameters(state: AudioSessionTestState, runtime: DspRuntimeParameters): void;
  createAnalyser(audioContext: AudioContext): AnalyserNode;
  createAudioSessionState(
    gainPercent: number,
    advancedAudioSettings: typeof DEFAULT_ADVANCED_AUDIO_SETTINGS,
    callbacks: {
      onTelemetry: (payload: unknown) => void;
      onFatalError?: (errorMessage: { key: string }) => void;
    }
  ): AudioSessionTestState;
  getSampleSize(meta: { compile_options?: string | null | undefined }): number;
  readPeak(analyser: AnalyserNode): number;
  roundTo(value: number, decimals: number): number;
  createNativeFallbackGraph(
    audioContext: AudioContext,
    inputAnalyserNode: AnalyserNode,
    outputAnalyserNode: AnalyserNode
  ): AudioSessionTestFallbackGraph;
  disconnectNativeFallbackGraph(fallbackGraph: AudioSessionTestFallbackGraph | null): void;
  applyNativeFallbackRuntimeParameters(
    fallbackGraph: AudioSessionTestFallbackGraph,
    runtime: DspRuntimeParameters
  ): void;
  attemptFaustRecovery(
    state: AudioSessionTestState,
    dependencies?: AudioSessionRecoveryDependencies
  ): Promise<void>;
  cancelFaustRecovery(state: AudioSessionTestState): void;
  createSoftClipCurve(intensity: number): Float32Array;
  dbToGain(decibels: number): number;
  clampNumber(value: number, min: number, max: number): number;
  emitCurrentAudioSessionTelemetry(state: AudioSessionTestState): void;
  ensureWorkletModule(audioContext: BaseAudioContext, modulePath: string): Promise<void>;
  handleAudioSessionFatalError(state: AudioSessionTestState, errorMessage: { key: string }): void;
  scheduleFaustRecovery(state: AudioSessionTestState): void;
  startAudioSession(state: AudioSessionTestState, streamId: string): Promise<void>;
  startAudioSessionMeter(state: AudioSessionTestState): void;
  stopAudioSession(state: AudioSessionTestState): Promise<void>;
};

function getAudioSessionTestables(): AudioSessionTestables {
  const testables = (AudioSession as typeof AudioSession & { __testables?: AudioSessionTestables }).__testables;
  expect(testables).toBeDefined();
  return testables!;
}

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
    session.setGainPercent(240);

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

    expect(hoisted.faustNodeInstances).toHaveLength(0);
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
    const __testables = getAudioSessionTestables();
    const state = __testables.createAudioSessionState(
      180,
      { ...DEFAULT_ADVANCED_AUDIO_SETTINGS },
      { onTelemetry, onFatalError }
    );

    await expect(__testables.startAudioSession(state, "stream-hard-fail")).rejects.toThrow(
      "The manual audio session could not initialize either Faust or the native fallback."
    );

    expect(onFatalError).toHaveBeenCalledWith({ key: "errorAudioPipelineStart" });
    expect(onTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 0,
        warning: "danger"
      })
    );
    expect(state.audioContext).toBeNull();
    expect(state.sourceNode).toBeNull();
    expect(state.engineStrategy).toBe("faust");
  });

  it("periodically retries Faust while running on the native fallback and restores it when available", async () => {
    getUserMedia.mockResolvedValue(new FakeMediaStream() as unknown as MediaStream);
    hoisted.factoryLoader.mockRejectedValueOnce(new Error("Faust init failed"));
    const session = new AudioSession(180, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }, { onTelemetry: vi.fn() });

    await session.start("stream-fallback-recovery");

    expect(hoisted.faustNodeInstances).toHaveLength(0);

    const recoveryCallback = [...intervalCallbacks.values()][0];
    recoveryCallback?.();
    await vi.waitFor(() => {
      expect(hoisted.faustNodeInstances).toHaveLength(1);
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
    const __testables = getAudioSessionTestables();
    const state = __testables.createAudioSessionState(
      180,
      { ...DEFAULT_ADVANCED_AUDIO_SETTINGS },
      { onTelemetry: vi.fn() }
    );

    expect(() => session.setGainPercent(240)).not.toThrow();
    expect(() =>
      session.setAdvancedAudioSettings({
        ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
        softClipMix: 11
      })
    ).not.toThrow();
    expect(() => __testables.emitCurrentAudioSessionTelemetry(state)).not.toThrow();
    expect(() => __testables.startAudioSessionMeter(state)).not.toThrow();

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

  it("exposes deterministic helper math, analyser calibration, and native fallback graph wiring", () => {
    const __testables = getAudioSessionTestables();
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

  it("applies the exact native fallback DSP parameters and clamped output shaping", () => {
    const __testables = getAudioSessionTestables();
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

  it("keeps helper hooks test-only instead of exporting them in production", () => {
    const source = readFileSync(fileURLToPath(new URL("./audio-session.ts", import.meta.url)), "utf8");

    expect(source).toContain('import.meta.env.MODE === "test"');
    expect(source).not.toContain("export const __testables");
  });

  it("keeps exact initial state, applies parameters to the active engine, and only reports fatal errors once", () => {
    const onTelemetry = vi.fn();
    const onFatalError = vi.fn();
    const __testables = getAudioSessionTestables();
    const state = __testables.createAudioSessionState(
      180,
      { ...DEFAULT_ADVANCED_AUDIO_SETTINGS },
      { onTelemetry, onFatalError }
    );
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

    expect(state.fatalErrorNotified).toBe(false);
    expect(state.faustRecoveryInFlight).toBe(false);
    expect(state.engineStrategy).toBe("faust");
    state.fallbackGraph = fallbackGraph;
    state.inputAnalyserNode = context.inputAnalyser;
    state.outputAnalyserNode = null;
    __testables.emitCurrentAudioSessionTelemetry(state);
    __testables.startAudioSessionMeter(state);
    expect(onTelemetry).not.toHaveBeenCalled();
    expect(windowSetInterval).not.toHaveBeenCalled();

    state.outputAnalyserNode = context.outputAnalyser;
    state.faustNode = faustNode;
    state.engineStrategy = "faust";
    __testables.applyAudioSessionRuntimeParameters(state);
    expect(faustNode.setParamValue).toHaveBeenCalled();
    expect(fallbackGraph.preGain.gain.value).toBe(0);

    faustNode.setParamValue.mockClear();
    state.faustNode = null;
    __testables.applyAudioSessionRuntimeParameters(state);
    expect(faustNode.setParamValue).not.toHaveBeenCalled();
    expect(fallbackGraph.preGain.gain.value).not.toBe(0);

    __testables.handleAudioSessionFatalError(state, { key: "errorAudioPipelineStart" });
    __testables.handleAudioSessionFatalError(state, { key: "errorAudioPipelineStart" });
    expect(onFatalError).toHaveBeenCalledTimes(1);
    expect(onTelemetry).toHaveBeenCalledTimes(1);
    expect(onTelemetry).toHaveBeenLastCalledWith(
      expect.objectContaining({
        level: 0,
        warning: "danger"
      })
    );
    expect(state.fatalErrorNotified).toBe(true);
  });

  it("keeps fatal handlers optional and resets exact runtime state after stop", async () => {
    getUserMedia.mockResolvedValue(new FakeMediaStream() as unknown as MediaStream);
    const __testables = getAudioSessionTestables();
    const state = __testables.createAudioSessionState(
      180,
      { ...DEFAULT_ADVANCED_AUDIO_SETTINGS },
      { onTelemetry: vi.fn() }
    );

    expect(() => __testables.handleAudioSessionFatalError(state, { key: "errorAudioPipelineStart" })).not.toThrow();
    expect(state.fatalErrorNotified).toBe(true);

    await __testables.startAudioSession(state, "stream-reset");
    state.fatalErrorNotified = true;
    state.faustRecoveryInFlight = true;
    state.engineStrategy = "native_fallback";
    await __testables.stopAudioSession(state);

    expect(state.latestMetrics).toMatchObject({
      clipEvents: 0,
      protectionBypassed: false
    });
    expect(state.fatalErrorNotified).toBe(false);
    expect(state.faustRecoveryInFlight).toBe(false);
    expect(state.engineStrategy).toBe("faust");
  });

  it("lets native fallback activation tolerate missing optional Faust and source nodes and no-op faust param writes", () => {
    const __testables = getAudioSessionTestables();
    const state = __testables.createAudioSessionState(
      180,
      { ...DEFAULT_ADVANCED_AUDIO_SETTINGS },
      { onTelemetry: vi.fn() }
    );
    const context = new FakeAudioContext();

    state.engineStrategy = "faust";
    state.audioContext = context;
    state.sourceNode = null;
    state.inputAnalyserNode = context.inputAnalyser;
    state.outputAnalyserNode = context.outputAnalyser;
    state.faustNode = null;

    expect(() =>
      __testables.applyFaustRuntimeParameters(
        state,
        applyQualityProtector(buildDspRuntimeParameters(180, DEFAULT_ADVANCED_AUDIO_SETTINGS))
      )
    ).not.toThrow();

    __testables.activateNativeFallbackFromFaust(state);
    expect(state.engineStrategy).toBe("native_fallback");
    expect(state.fallbackGraph).not.toBeNull();
  });

  it("guards fallback activation and recovery timers, and caches worklet modules per context", async () => {
    const __testables = getAudioSessionTestables();
    const state = __testables.createAudioSessionState(
      180,
      { ...DEFAULT_ADVANCED_AUDIO_SETTINGS },
      { onTelemetry: vi.fn() }
    );
    const context = new FakeAudioContext();
    const faustNode = {
      listeners: new Map<string, EventListener>(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      addEventListener: vi.fn(),
      setParamValue: vi.fn(),
      options: {}
    } as unknown as MockFaustNode;

    state.engineStrategy = "native_fallback";
    __testables.activateNativeFallbackFromFaust(state);
    expect(state.fallbackGraph).toBeNull();

    state.engineStrategy = "faust";
    state.audioContext = context;
    state.sourceNode = context.sourceNode;
    state.inputAnalyserNode = context.inputAnalyser;
    state.outputAnalyserNode = context.outputAnalyser;
    state.faustNode = faustNode;
    __testables.activateNativeFallbackFromFaust(state);

    expect(state.engineStrategy).toBe("native_fallback");
    expect(faustNode.disconnect).toHaveBeenCalledTimes(1);
    expect(context.sourceNode.disconnect).toHaveBeenCalledTimes(1);
    expect(context.sourceNode.connect).toHaveBeenCalledWith(context.inputAnalyser);
    expect(state.fallbackGraph).not.toBeNull();
    __testables.scheduleFaustRecovery(state);
    __testables.scheduleFaustRecovery(state);
    expect(windowSetInterval).toHaveBeenCalledTimes(1);

    await __testables.attemptFaustRecovery(state);
    expect(state.engineStrategy).toBe("faust");
    expect(state.faustRecoveryInFlight).toBe(false);
    __testables.cancelFaustRecovery(state);
    expect(windowClearInterval).toHaveBeenCalled();
    expect(state.faustRecoveryIntervalId).toBeNull();
    expect(state.faustRecoveryInFlight).toBe(false);

    const cacheContext = new FakeAudioContext() as unknown as BaseAudioContext;
    await __testables.ensureWorkletModule(cacheContext, "mono-worklet.js");
    await __testables.ensureWorkletModule(cacheContext, "mono-worklet.js");
    expect((cacheContext as unknown as FakeAudioContext).audioWorklet.addModule).toHaveBeenCalledTimes(1);
  });

  it("guards faust recovery while in flight and reports fatal errors when recovery cannot restore either engine", async () => {
    const onFatalError = vi.fn();
    const __testables = getAudioSessionTestables();
    const state = __testables.createAudioSessionState(
      180,
      { ...DEFAULT_ADVANCED_AUDIO_SETTINGS },
      { onTelemetry: vi.fn(), onFatalError }
    );
    const context = new FakeAudioContext();
    let resolveRecovery: (() => void) | undefined;

    state.engineStrategy = "native_fallback";
    state.audioContext = context;
    state.inputAnalyserNode = context.inputAnalyser;
    state.outputAnalyserNode = context.outputAnalyser;
    state.currentAsset = (selectFaustAsset as ReturnType<typeof vi.fn>).mock.results[0]?.value ?? {
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
    };
    const connectFaustGraph = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRecovery = resolve;
        })
    );

    const firstRecovery = __testables.attemptFaustRecovery(state, { connectFaustGraph });
    expect(state.faustRecoveryInFlight).toBe(true);
    await __testables.attemptFaustRecovery(state, { connectFaustGraph });
    expect(connectFaustGraph).toHaveBeenCalledTimes(1);

    resolveRecovery?.();
    await firstRecovery;
    expect(state.faustRecoveryInFlight).toBe(false);
    expect(state.engineStrategy).toBe("faust");

    state.engineStrategy = "native_fallback";
    await __testables.attemptFaustRecovery(state, {
      activateNativeFallbackGraph: vi.fn(() => {
        throw new Error("Fallback recovery failed");
      }),
      connectFaustGraph: vi.fn(async () => {
        throw new Error("Faust recovery failed");
      })
    });

    expect(onFatalError).toHaveBeenCalledWith({ key: "errorAudioPipelineStart" });
    expect(state.faustRecoveryInFlight).toBe(false);
  });
});
