import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../shared/audio-settings";

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

class FakeAnalyserNode extends FakeNode {
  fftSize = 0;
  smoothingTimeConstant = 0;
  peak = 0;
  readonly getFloatTimeDomainData = vi.fn((buffer: Float32Array) => {
    buffer.fill(0);
    buffer[0] = this.peak;
  });
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
  readonly createMediaStreamSource = vi.fn((_stream: MediaStream) => this.sourceNode as unknown as MediaStreamAudioSourceNode);
  readonly createAnalyser = vi
    .fn()
    .mockReturnValueOnce(this.inputAnalyser as unknown as AnalyserNode)
    .mockReturnValueOnce(this.outputAnalyser as unknown as AnalyserNode);
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
  const windowSetInterval = vi.fn(() => 55);
  const windowClearInterval = vi.fn();

  beforeEach(() => {
    FakeAudioContext.reset();
    hoisted.faustNodeInstances.length = 0;
    hoisted.factoryLoader.mockClear();
    getUserMedia.mockReset();
    windowSetInterval.mockClear();
    windowClearInterval.mockClear();

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

  it("emits danger telemetry when the processor errors", async () => {
    getUserMedia.mockResolvedValue(new FakeMediaStream() as unknown as MediaStream);
    const onTelemetry = vi.fn();
    const session = new AudioSession(180, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }, { onTelemetry });

    await session.start("stream-789");
    const faustNode = hoisted.faustNodeInstances[0] as MockFaustNode;
    const processorErrorListener = faustNode.listeners.get("processorerror");

    processorErrorListener?.(new Event("processorerror"));

    expect(onTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 0,
        warning: "danger"
      })
    );

    await session.stop();
  });

  it("stops the graph, tracks and interval cleanly", async () => {
    const stream = new FakeMediaStream();
    getUserMedia.mockResolvedValue(stream as unknown as MediaStream);
    const session = new AudioSession(180, { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }, { onTelemetry: vi.fn() });

    await session.start("stream-stop");
    const context = FakeAudioContext.instances[0];

    await session.stop();

    expect(windowClearInterval).toHaveBeenCalledWith(55);
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
});
