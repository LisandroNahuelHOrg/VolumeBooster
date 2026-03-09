// @vitest-environment happy-dom

import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  applyQualityProtector,
  buildDspRuntimeParameters,
  createDefaultMetrics,
  DEFAULT_ADVANCED_AUDIO_SETTINGS,
  deriveMetricsFromPeaks,
  deriveWarningFromMetrics
} from "../shared/audio-settings";
import { METER_SAMPLE_MS } from "../shared/constants";
import type { BridgeStatusPayload, BridgeTelemetryPayload } from "./bridge-protocol";
import {
  BRIDGE_COMMAND_EVENT,
  BRIDGE_STATUS_EVENT,
  BRIDGE_TELEMETRY_EVENT,
  createBridgeCommandEvent
} from "./bridge-protocol";

class FakeAudioParam {
  value = 0;
}

class FakeAudioNode {
  readonly connections: Array<{
    destination: FakeAudioNode | FakeAudioParam;
    output?: number;
    input?: number;
  }> = [];
  readonly disconnections: Array<{
    destination?: FakeAudioNode | FakeAudioParam;
    output?: number;
    input?: number;
  }> = [];

  constructor(public readonly context: FakeAudioContext) {}

  connect(destination: FakeAudioNode | FakeAudioParam, output?: number, input?: number): FakeAudioNode {
    this.connections.push({ destination, output, input });
    return destination instanceof FakeAudioNode ? destination : this;
  }

  disconnect(destination?: FakeAudioNode | FakeAudioParam, output?: number, input?: number): void {
    this.disconnections.push({ destination, output, input });
  }
}

class FakeGainNode extends FakeAudioNode {
  gain = new FakeAudioParam();
}

class FakeBiquadFilterNode extends FakeAudioNode {
  type = "lowpass";
  frequency = new FakeAudioParam();
  Q = new FakeAudioParam();
  gain = new FakeAudioParam();
}

class FakeDynamicsCompressorNode extends FakeAudioNode {
  threshold = new FakeAudioParam();
  knee = new FakeAudioParam();
  ratio = new FakeAudioParam();
  attack = new FakeAudioParam();
  release = new FakeAudioParam();
}

class FakeWaveShaperNode extends FakeAudioNode {
  curve: Float32Array | null = null;
}

class FakeAnalyserNode extends FakeAudioNode {
  static seededData: number[][] = [];

  fftSize = 0;
  smoothingTimeConstant = 0;
  private readonly data: number[];

  constructor(context: FakeAudioContext) {
    super(context);
    this.data = FakeAnalyserNode.seededData.shift() ?? [0, 0, 0];
  }

  getFloatTimeDomainData(buffer: Float32Array): void {
    buffer.fill(0);
    this.data.forEach((sample, index) => {
      if (index < buffer.length) {
        buffer[index] = sample;
      }
    });
  }
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  static nextStates: AudioContextState[] = [];
  static nextResumeShouldReject = false;

  readonly destination: FakeAudioNode;
  state: AudioContextState;
  readonly createdGains: FakeGainNode[] = [];
  readonly createdAnalysers: FakeAnalyserNode[] = [];
  readonly createdBiquads: FakeBiquadFilterNode[] = [];
  readonly createdCompressors: FakeDynamicsCompressorNode[] = [];
  readonly createdWaveShapers: FakeWaveShaperNode[] = [];

  constructor() {
    this.state = FakeAudioContext.nextStates.shift() ?? "running";
    this.destination = new FakeAudioNode(this);
    FakeAudioContext.instances.push(this);
  }

  static reset(): void {
    FakeAudioContext.instances = [];
    FakeAudioContext.nextStates = [];
    FakeAudioContext.nextResumeShouldReject = false;
    FakeAnalyserNode.seededData = [];
  }

  createGain(): FakeGainNode {
    const node = new FakeGainNode(this);
    this.createdGains.push(node);
    return node;
  }

  createAnalyser(): FakeAnalyserNode {
    const node = new FakeAnalyserNode(this);
    this.createdAnalysers.push(node);
    return node;
  }

  createBiquadFilter(): FakeBiquadFilterNode {
    const node = new FakeBiquadFilterNode(this);
    this.createdBiquads.push(node);
    return node;
  }

  createDynamicsCompressor(): FakeDynamicsCompressorNode {
    const node = new FakeDynamicsCompressorNode(this);
    this.createdCompressors.push(node);
    return node;
  }

  createWaveShaper(): FakeWaveShaperNode {
    const node = new FakeWaveShaperNode(this);
    this.createdWaveShapers.push(node);
    return node;
  }

  async resume(): Promise<void> {
    if (FakeAudioContext.nextResumeShouldReject) {
      FakeAudioContext.nextResumeShouldReject = false;
      throw new Error("autoplay blocked");
    }

    if (this.state === "suspended") {
      this.state = "running";
    }
  }
}

function installBridgeTestGlobals(): void {
  vi.stubGlobal("AudioParam", FakeAudioParam as unknown as typeof AudioParam);
  vi.stubGlobal("AudioNode", FakeAudioNode as unknown as typeof AudioNode);
  vi.stubGlobal("AudioContext", FakeAudioContext as unknown as typeof AudioContext);
  Object.defineProperty(window, "webkitAudioContext", {
    configurable: true,
    writable: true,
    value: undefined
  });
}

function getBridgeNodes(context: FakeAudioContext) {
  const [inputNode, preGain, wetGain, dryGain] = context.createdGains;
  const [inputAnalyser, outputAnalyser] = context.createdAnalysers;
  const [lowShelf, midPeak] = context.createdBiquads;
  const [compressor] = context.createdCompressors;
  const [shaper] = context.createdWaveShapers;

  return {
    inputNode,
    preGain,
    wetGain,
    dryGain,
    inputAnalyser,
    outputAnalyser,
    lowShelf,
    midPeak,
    compressor,
    shaper
  };
}

function seedStatusAndTelemetryCollectors() {
  const statusEvents: BridgeStatusPayload[] = [];
  const telemetryEvents: BridgeTelemetryPayload[] = [];

  window.addEventListener(BRIDGE_STATUS_EVENT, (event) => {
    statusEvents.push((event as CustomEvent<{ payload: BridgeStatusPayload }>).detail.payload);
  });
  window.addEventListener(BRIDGE_TELEMETRY_EVENT, (event) => {
    telemetryEvents.push((event as CustomEvent<{ payload: BridgeTelemetryPayload }>).detail.payload);
  });

  return { statusEvents, telemetryEvents };
}

function expectedCurveValue(intensity: number, index: number, length: number): number {
  const drive = 1 + intensity / 6;
  const x = (index / (length - 1)) * 2 - 1;
  return Math.tanh(x * drive);
}

const generatedUnitModulePaths = new Set<string>();

async function loadMainWorldUnitModule() {
  const sourcePath = resolve(process.cwd(), "src/content/main-world.ts");
  const source = readFileSync(sourcePath, "utf8");
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const unitPath = resolve(process.cwd(), `src/content/__main-world-unit-${suffix}.ts`);
  const unitSource = `${source}

export const __unit = {
  WebAudioBridgeController,
  createBridgeState,
  createAnalyser,
  createSoftClipCurve,
  readPeak,
  getAutoplayPolicy,
  dbToGain,
  clampNumber,
  roundTo,
  pickHighestWarning
};
`;

  writeFileSync(unitPath, unitSource, "utf8");
  generatedUnitModulePaths.add(unitPath);
  window.__PRISM_AUTO_BOOSTER_MAIN_WORLD_BOOTED__ = true;

  return import(`${pathToFileURL(unitPath).href}?t=${suffix}`) as Promise<{
    __unit: {
      WebAudioBridgeController: new () => unknown;
      createBridgeState: (context: AudioContext, id: number) => unknown;
      createAnalyser: (context: AudioContext) => AnalyserNode;
      createSoftClipCurve: (intensity: number) => Float32Array;
      readPeak: (analyser: AnalyserNode) => number;
      getAutoplayPolicy: (audioContext: AudioContext) => string | undefined;
      dbToGain: (decibels: number) => number;
      clampNumber: (value: number, min: number, max: number) => number;
      roundTo: (value: number, precision: number) => number;
      pickHighestWarning: (current: "none" | "high" | "danger", next: "none" | "high" | "danger") => string;
    };
  }>;
}

describe("main-world bridge", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
    FakeAudioContext.reset();
    for (const unitPath of generatedUnitModulePaths) {
      rmSync(unitPath, { force: true });
    }
    generatedUnitModulePaths.clear();
    delete window.__PRISM_AUTO_BOOSTER_MAIN_WORLD_BOOTED__;
    delete window.__PRISM_AUTO_BOOSTER_MAIN_IMPORT_PROMISE__;
  });

  it("bootstraps, patches constructors, wires the bridge graph, and emits idle status without test hooks", async () => {
    installBridgeTestGlobals();
    const { statusEvents } = seedStatusAndTelemetryCollectors();

    window.history.replaceState({}, "", "/player");

    await import("./main-world");

    expect(statusEvents.at(-1)).toMatchObject({
      enabled: false,
      attachState: "idle",
      activeStrategy: "none",
      audioContextState: "none",
      currentUrl: "http://localhost:3000/player"
    });
    expect(window.AudioContext.name).toBe("FakeAudioContext");
    expect(window.__PRISM_AUTO_BOOSTER_MAIN_WORLD_BOOTED__).toBe(true);
    expect((window as Window & { __PRISM_AUTO_BOOSTER_MAIN_WORLD_TESTABLES__?: unknown })
      .__PRISM_AUTO_BOOSTER_MAIN_WORLD_TESTABLES__).toBeUndefined();

    const context = new AudioContext() as unknown as FakeAudioContext;
    const bridgeNodes = getBridgeNodes(context);

    expect(context.createdGains).toHaveLength(4);
    expect(context.createdAnalysers).toHaveLength(2);
    expect(context.createdBiquads).toHaveLength(2);
    expect(context.createdCompressors).toHaveLength(1);
    expect(context.createdWaveShapers).toHaveLength(1);
    expect(bridgeNodes.inputNode.connections[0]?.destination).toBe(bridgeNodes.inputAnalyser);
    expect(bridgeNodes.inputAnalyser.connections[0]?.destination).toBe(bridgeNodes.preGain);
    expect(bridgeNodes.preGain.connections[0]?.destination).toBe(bridgeNodes.lowShelf);
    expect(bridgeNodes.lowShelf.connections[0]?.destination).toBe(bridgeNodes.midPeak);
    expect(bridgeNodes.midPeak.connections[0]?.destination).toBe(bridgeNodes.compressor);
    expect(bridgeNodes.compressor.connections[0]?.destination).toBe(bridgeNodes.shaper);
    expect(bridgeNodes.shaper.connections[0]?.destination).toBe(bridgeNodes.outputAnalyser);
    expect(bridgeNodes.outputAnalyser.connections[0]?.destination).toBe(bridgeNodes.wetGain);
    expect(bridgeNodes.wetGain.connections[0]?.destination).toBe(context.destination);
    expect(bridgeNodes.dryGain.connections[0]?.destination).toBe(context.destination);
    expect(statusEvents.at(-1)).toMatchObject({
      enabled: false,
      attachState: "idle",
      audioContextState: "running",
      audioContextCount: 1,
      attachedNodeCount: 0
    });
  });

  it("applies exact runtime parameters, reroutes external nodes, and restores bypass values on disable", async () => {
    installBridgeTestGlobals();
    const { statusEvents } = seedStatusAndTelemetryCollectors();

    await import("./main-world");

    const context = new AudioContext() as unknown as FakeAudioContext;
    const externalNode = context.createGain();
    const bridgeNodes = getBridgeNodes(context);
    const runtime = applyQualityProtector(buildDspRuntimeParameters(500, DEFAULT_ADVANCED_AUDIO_SETTINGS));

    window.dispatchEvent(
      createBridgeCommandEvent({
        type: "configure",
        payload: {
          tabId: 7,
          scope: "site",
          enabled: true,
          suspended: false,
          gainPercent: 500,
          advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
        }
      })
    );

    expect(bridgeNodes.inputAnalyser.fftSize).toBe(1024);
    expect(bridgeNodes.outputAnalyser.fftSize).toBe(1024);
    expect(bridgeNodes.inputAnalyser.smoothingTimeConstant).toBe(0.04);
    expect(bridgeNodes.outputAnalyser.smoothingTimeConstant).toBe(0.04);
    expect(bridgeNodes.lowShelf.type).toBe("lowshelf");
    expect(bridgeNodes.lowShelf.frequency.value).toBe(180);
    expect(bridgeNodes.lowShelf.gain.value).toBeCloseTo(
      runtime.toneLowBandGainDb + runtime.lowBandTrimDb + runtime.lowBandMakeupDb,
      9
    );
    expect(bridgeNodes.midPeak.type).toBe("peaking");
    expect(bridgeNodes.midPeak.frequency.value).toBe(1700);
    expect(bridgeNodes.midPeak.Q.value).toBeCloseTo(0.82, 9);
    expect(bridgeNodes.midPeak.gain.value).toBeCloseTo(
      runtime.toneMidBandGainDb + runtime.clarityPresenceTiltDb - runtime.midHighThresholdOffsetDb * 0.08,
      9
    );
    expect(bridgeNodes.preGain.gain.value).toBeCloseTo(Math.pow(10, runtime.inputDriveDb / 20), 9);
    expect(bridgeNodes.compressor.threshold.value).toBeCloseTo(
      Math.min(-6, Math.max(-60, -32 - runtime.multibandDepth * 0.14 + runtime.lowBandThresholdOffsetDb)),
      9
    );
    expect(bridgeNodes.compressor.knee.value).toBeCloseTo(Math.min(30, Math.max(0, 18 - runtime.lowBandRatioBias * 8)), 9);
    expect(bridgeNodes.compressor.ratio.value).toBeCloseTo(
      Math.min(20, Math.max(1, 1.8 + runtime.multibandDepth * 0.11 + runtime.lowBandRatioBias * 2.4)),
      9
    );
    expect(bridgeNodes.compressor.attack.value).toBeCloseTo(Math.max(runtime.lookaheadMs / 1000, 0.003), 9);
    expect(bridgeNodes.compressor.release.value).toBeCloseTo(Math.min(1.2, Math.max(0.06, runtime.releaseMs / 1000)), 9);
    expect(bridgeNodes.shaper.curve).toHaveLength(1024);
    expect(bridgeNodes.shaper.curve?.[0]).toBeCloseTo(expectedCurveValue(runtime.outputSoftClipMix, 0, 1024), 6);
    expect(bridgeNodes.shaper.curve?.[512]).toBeCloseTo(expectedCurveValue(runtime.outputSoftClipMix, 512, 1024), 6);
    expect(bridgeNodes.shaper.curve?.[1023]).toBeCloseTo(expectedCurveValue(runtime.outputSoftClipMix, 1023, 1024), 6);
    expect(bridgeNodes.wetGain.gain.value).toBeCloseTo(Math.pow(10, Math.min(0, runtime.outputCeilingDb) / 20), 9);
    expect(bridgeNodes.dryGain.gain.value).toBe(0);

    externalNode.connect(context.destination);

    expect(externalNode.connections.at(-1)?.destination).toBe(bridgeNodes.inputNode);
    expect(statusEvents.at(-1)).toMatchObject({
      enabled: true,
      attachState: "attached",
      activeStrategy: "web_audio_bridge",
      audioContextState: "running",
      audioContextCount: 1,
      attachedNodeCount: 1
    });

    window.dispatchEvent(
      createBridgeCommandEvent({
        type: "disable",
        payload: { tabId: 7 }
      })
    );

    expect(bridgeNodes.preGain.gain.value).toBe(1);
    expect(bridgeNodes.lowShelf.gain.value).toBe(0);
    expect(bridgeNodes.midPeak.gain.value).toBe(0);
    expect(bridgeNodes.compressor.threshold.value).toBe(-3);
    expect(bridgeNodes.compressor.knee.value).toBe(0);
    expect(bridgeNodes.compressor.ratio.value).toBe(1);
    expect(bridgeNodes.compressor.attack.value).toBe(0.003);
    expect(bridgeNodes.compressor.release.value).toBe(0.06);
    expect(bridgeNodes.wetGain.gain.value).toBe(0);
    expect(bridgeNodes.dryGain.gain.value).toBe(1);
    expect(statusEvents.at(-1)).toMatchObject({
      enabled: false,
      attachState: "idle",
      activeStrategy: "web_audio_bridge",
      attachedNodeCount: 1
    });
  });

  it("publishes exact aggregated telemetry and stops emitting when disabled", async () => {
    vi.useFakeTimers();
    installBridgeTestGlobals();
    const { telemetryEvents } = seedStatusAndTelemetryCollectors();

    FakeAnalyserNode.seededData = [
      [0.35, -0.35, 0.2],
      [0.18, -0.18, 0.1],
      [0.92, -0.92, 0.71],
      [0.77, -0.77, 0.61]
    ];

    await import("./main-world");

    const firstContext = new AudioContext() as unknown as FakeAudioContext;
    const secondContext = new AudioContext() as unknown as FakeAudioContext;
    const firstExternalNode = firstContext.createGain();
    const secondExternalNode = secondContext.createGain();
    const firstBridgeNodes = getBridgeNodes(firstContext);
    const secondBridgeNodes = getBridgeNodes(secondContext);
    const runtime = applyQualityProtector(buildDspRuntimeParameters(500, DEFAULT_ADVANCED_AUDIO_SETTINGS));
    const firstInputPeak = 0.35;
    const firstOutputPeak = 0.18;
    const secondInputPeak = 0.92;
    const secondOutputPeak = 0.77;
    const firstMetrics = deriveMetricsFromPeaks(runtime, firstInputPeak, firstOutputPeak, createDefaultMetrics(true));
    const secondMetrics = deriveMetricsFromPeaks(runtime, secondInputPeak, secondOutputPeak, createDefaultMetrics(true));
    const firstWarning = deriveWarningFromMetrics(firstMetrics);
    const secondWarning = deriveWarningFromMetrics(secondMetrics);
    const firstLevel = Math.min(1, Math.max(firstOutputPeak, firstInputPeak * 0.45));
    const secondLevel = Math.min(1, Math.max(secondOutputPeak, secondInputPeak * 0.45));

    window.dispatchEvent(
      createBridgeCommandEvent({
        type: "configure",
        payload: {
          tabId: 11,
          scope: "site",
          enabled: true,
          suspended: false,
          gainPercent: 500,
          advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
        }
      })
    );

    firstExternalNode.connect(firstContext.destination);
    secondExternalNode.connect(secondContext.destination);

    expect(firstExternalNode.connections.at(-1)?.destination).toBe(firstBridgeNodes.inputNode);
    expect(secondExternalNode.connections.at(-1)?.destination).toBe(secondBridgeNodes.inputNode);

    await vi.advanceTimersByTimeAsync(METER_SAMPLE_MS);

    expect(telemetryEvents.length).toBeGreaterThanOrEqual(1);
    expect(telemetryEvents.at(-1)).toMatchObject({
      activeStrategy: "web_audio_bridge",
      level: Math.round(Math.max(firstLevel, secondLevel) * 10000) / 10000,
      warning:
        firstWarning === "danger" || secondWarning === "danger"
          ? "danger"
          : firstWarning === "high" || secondWarning === "high"
            ? "high"
            : "none",
      metrics: {
        protectorActionDb:
          Math.round(Math.max(firstMetrics.protectorActionDb, secondMetrics.protectorActionDb) * 100) / 100,
        clipEvents: firstMetrics.clipEvents + secondMetrics.clipEvents,
        clipPeak: Math.round(Math.max(firstMetrics.clipPeak, secondMetrics.clipPeak) * 10000) / 10000,
        protectionBypassed: firstMetrics.protectionBypassed || secondMetrics.protectionBypassed,
        outputPeak: Math.round(Math.max(firstOutputPeak, secondOutputPeak) * 10000) / 10000
      },
      audioContextCount: 2,
      attachedNodeCount: 2
    });
    expect(telemetryEvents.at(-1)?.lastTelemetryAt).toEqual(expect.any(Number));

    window.dispatchEvent(
      createBridgeCommandEvent({
        type: "disable",
        payload: { tabId: 11 }
      })
    );

    const telemetryCountAfterDisable = telemetryEvents.length;
    await vi.advanceTimersByTimeAsync(METER_SAMPLE_MS * 2);
    expect(telemetryEvents).toHaveLength(telemetryCountAfterDisable);
  });

  it("reports autoplay-blocked, fallback autoplay-policy paths, and observing transitions through connect and disconnect", async () => {
    installBridgeTestGlobals();
    const { statusEvents } = seedStatusAndTelemetryCollectors();

    const getAutoplayPolicy = vi.fn((target?: unknown) => {
      if (typeof target === "string") {
        return "allowed";
      }

      throw new Error("context policy unavailable");
    });

    Object.defineProperty(navigator, "getAutoplayPolicy", {
      configurable: true,
      value: getAutoplayPolicy
    });

    await import("./main-world");

    window.dispatchEvent(
      createBridgeCommandEvent({
        type: "configure",
        payload: {
          tabId: 21,
          scope: "global",
          enabled: true,
          suspended: false,
          gainPercent: 300,
          advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
        }
      })
    );

    expect(statusEvents.at(-1)).toMatchObject({
      enabled: true,
      scope: "global",
      attachState: "observing",
      attachReason: "no_media",
      autoplayPolicy: undefined
    });

    FakeAudioContext.nextStates = ["suspended"];
    FakeAudioContext.nextResumeShouldReject = true;
    const blockedContext = new AudioContext() as unknown as FakeAudioContext;
    const blockedExternalNode = blockedContext.createGain();
    const blockedBridgeNodes = getBridgeNodes(blockedContext);

    blockedExternalNode.connect(blockedContext.destination);

    expect(blockedExternalNode.connections.at(-1)?.destination).toBe(blockedBridgeNodes.inputNode);
    expect(statusEvents.at(-1)).toMatchObject({
      attachState: "awaiting_user_gesture",
      attachReason: "autoplay_blocked",
      activeStrategy: "web_audio_bridge",
      audioContextState: "suspended",
      autoplayPolicy: "allowed",
      audioContextCount: 1,
      attachedNodeCount: 1
    });
    expect(getAutoplayPolicy).toHaveBeenCalledWith(blockedContext);
    expect(getAutoplayPolicy).toHaveBeenCalledWith("audiocontext");

    blockedExternalNode.disconnect(blockedContext.destination);

    expect(statusEvents.at(-1)).toMatchObject({
      attachState: "awaiting_user_gesture",
      attachReason: "autoplay_blocked",
      attachedNodeCount: 0
    });

    Object.defineProperty(navigator, "getAutoplayPolicy", {
      configurable: true,
      value: () => {
        throw new Error("policy unavailable");
      }
    });

    const runningContext = new AudioContext() as unknown as FakeAudioContext;
    const runningExternalNode = runningContext.createGain();
    runningExternalNode.connect(runningContext.destination);

    expect(statusEvents.at(-1)).toMatchObject({
      attachState: "attached",
      attachReason: undefined,
      autoplayPolicy: undefined,
      audioContextCount: 2,
      attachedNodeCount: 1
    });

    blockedContext.state = "running";
    runningExternalNode.disconnect();

    expect(statusEvents.at(-1)).toMatchObject({
      attachState: "observing",
      attachReason: "no_media",
      autoplayPolicy: undefined,
      audioContextState: "running",
      attachedNodeCount: 0
    });
  });

  it("exposes helper math and policy fallbacks through a test-only transformed module", async () => {
    installBridgeTestGlobals();
    const { __unit } = await loadMainWorldUnitModule();

    FakeAnalyserNode.seededData = [[0.25, -0.82, 0.41]];
    const context = new AudioContext();
    const analyser = __unit.createAnalyser(context);
    const curve = __unit.createSoftClipCurve(12);

    expect(analyser.fftSize).toBe(1024);
    expect(analyser.smoothingTimeConstant).toBe(0.04);
    expect(__unit.readPeak(analyser)).toBe(0.82);
    expect(curve).toHaveLength(1024);
    expect(curve[0]).toBeCloseTo(expectedCurveValue(12, 0, 1024), 6);
    expect(curve[512]).toBeCloseTo(expectedCurveValue(12, 512, 1024), 6);
    expect(curve[1023]).toBeCloseTo(expectedCurveValue(12, 1023, 1024), 6);
    expect(__unit.dbToGain(-6)).toBeCloseTo(Math.pow(10, -6 / 20), 9);
    expect(__unit.clampNumber(-5, 0, 10)).toBe(0);
    expect(__unit.clampNumber(5, 0, 10)).toBe(5);
    expect(__unit.clampNumber(15, 0, 10)).toBe(10);
    expect(__unit.roundTo(0.123456, 4)).toBe(0.1235);
    expect(__unit.pickHighestWarning("none", "none")).toBe("none");
    expect(__unit.pickHighestWarning("none", "high")).toBe("high");
    expect(__unit.pickHighestWarning("high", "danger")).toBe("danger");
    expect(__unit.pickHighestWarning("danger", "none")).toBe("danger");

    Object.defineProperty(navigator, "getAutoplayPolicy", {
      configurable: true,
      value: undefined
    });
    expect(__unit.getAutoplayPolicy(context)).toBeUndefined();

    Object.defineProperty(navigator, "getAutoplayPolicy", {
      configurable: true,
      value: () => {
        throw new Error("unavailable");
      }
    });
    expect(__unit.getAutoplayPolicy(context)).toBeUndefined();

    Object.defineProperty(navigator, "getAutoplayPolicy", {
      configurable: true,
      value: (target?: unknown) => {
        if (typeof target === "string") {
          return "allowed";
        }

        throw new Error("context blocked");
      }
    });
    expect(__unit.getAutoplayPolicy(context)).toBe("allowed");
  });

  it("creates bridge state with internal-node membership and default bypass metrics through the transformed module", async () => {
    installBridgeTestGlobals();
    const { __unit } = await loadMainWorldUnitModule();
    const context = new AudioContext() as unknown as FakeAudioContext;
    const bridgeState = __unit.createBridgeState(context as unknown as AudioContext, 42) as {
      id: number;
      inputNode: FakeGainNode;
      inputAnalyser: FakeAnalyserNode;
      preGain: FakeGainNode;
      lowShelf: FakeBiquadFilterNode;
      midPeak: FakeBiquadFilterNode;
      compressor: FakeDynamicsCompressorNode;
      shaper: FakeWaveShaperNode;
      outputAnalyser: FakeAnalyserNode;
      wetGain: FakeGainNode;
      dryGain: FakeGainNode;
      internalNodes: WeakSet<AudioNode>;
      attachedNodes: Set<AudioNode>;
      lastMetrics: ReturnType<typeof createDefaultMetrics>;
    };

    expect(bridgeState.id).toBe(42);
    expect(bridgeState.attachedNodes.size).toBe(0);
    expect(bridgeState.internalNodes.has(bridgeState.inputNode as unknown as AudioNode)).toBe(true);
    expect(bridgeState.internalNodes.has(bridgeState.inputAnalyser as unknown as AudioNode)).toBe(true);
    expect(bridgeState.internalNodes.has(bridgeState.preGain as unknown as AudioNode)).toBe(true);
    expect(bridgeState.internalNodes.has(bridgeState.lowShelf as unknown as AudioNode)).toBe(true);
    expect(bridgeState.internalNodes.has(bridgeState.midPeak as unknown as AudioNode)).toBe(true);
    expect(bridgeState.internalNodes.has(bridgeState.compressor as unknown as AudioNode)).toBe(true);
    expect(bridgeState.internalNodes.has(bridgeState.shaper as unknown as AudioNode)).toBe(true);
    expect(bridgeState.internalNodes.has(bridgeState.outputAnalyser as unknown as AudioNode)).toBe(true);
    expect(bridgeState.internalNodes.has(bridgeState.wetGain as unknown as AudioNode)).toBe(true);
    expect(bridgeState.internalNodes.has(bridgeState.dryGain as unknown as AudioNode)).toBe(true);
    expect(bridgeState.lastMetrics).toEqual(createDefaultMetrics(true));
    expect(bridgeState.inputNode.connections[0]?.destination).toBe(bridgeState.inputAnalyser);
    expect(bridgeState.outputAnalyser.connections[0]?.destination).toBe(bridgeState.wetGain);
    expect(bridgeState.wetGain.connections[0]?.destination).toBe(context.destination);
    expect(bridgeState.dryGain.connections[0]?.destination).toBe(context.destination);
  });

  it("guards telemetry timers, filters inactive bridge states, and tracks bridge memberships through the transformed controller", async () => {
    vi.useFakeTimers();
    installBridgeTestGlobals();
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");
    const { __unit } = await loadMainWorldUnitModule();
    const { telemetryEvents } = seedStatusAndTelemetryCollectors();
    const controller = new __unit.WebAudioBridgeController() as {
      bridgeStateList: Array<ReturnType<typeof __unit.createBridgeState>>;
      nodeBridgeMembership: WeakMap<AudioNode, Set<number>>;
      telemetryTimer: number | null;
      state: {
        enabled: boolean;
        suspended: boolean;
        scope: "site" | "global" | null;
        gainPercent: number;
        advancedAudioSettings: typeof DEFAULT_ADVANCED_AUDIO_SETTINGS | null;
      };
      syncTelemetryLoop: () => void;
      publishTelemetry: () => void;
      attachExternalNode: (bridgeState: ReturnType<typeof __unit.createBridgeState>, node: AudioNode) => void;
      detachExternalNode: (bridgeState: ReturnType<typeof __unit.createBridgeState>, node: AudioNode) => void;
      buildStatusPayload: () => BridgeStatusPayload;
    };

    expect(controller.buildStatusPayload()).toMatchObject({
      enabled: false,
      attachState: "idle",
      activeStrategy: "none",
      audioContextCount: 0,
      attachedNodeCount: 0
    });

    controller.publishTelemetry();
    expect(telemetryEvents).toHaveLength(0);
    controller.syncTelemetryLoop();
    expect(setIntervalSpy).not.toHaveBeenCalled();

    FakeAnalyserNode.seededData = [
      [0.31, -0.31, 0.12],
      [0.22, -0.22, 0.08],
      [0.99, -0.99, 0.88],
      [0.98, -0.98, 0.92]
    ];

    const activeContext = new AudioContext() as unknown as FakeAudioContext;
    const inactiveContext = new AudioContext() as unknown as FakeAudioContext;
    const activeBridge = __unit.createBridgeState(activeContext as unknown as AudioContext, 1);
    const inactiveBridge = __unit.createBridgeState(inactiveContext as unknown as AudioContext, 2);
    const sharedNode = activeContext.createGain() as unknown as AudioNode;
    const activeRuntime = applyQualityProtector(buildDspRuntimeParameters(500, DEFAULT_ADVANCED_AUDIO_SETTINGS));
    const activeMetrics = deriveMetricsFromPeaks(activeRuntime, 0.31, 0.22, createDefaultMetrics(true));

    controller.bridgeStateList.push(activeBridge, inactiveBridge);
    controller.state = {
      enabled: true,
      suspended: false,
      scope: "site",
      gainPercent: 500,
      advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
    };

    controller.attachExternalNode(activeBridge, sharedNode);
    expect(controller.nodeBridgeMembership.get(sharedNode)).toEqual(new Set([1]));
    controller.attachExternalNode(inactiveBridge, sharedNode);
    expect(controller.nodeBridgeMembership.get(sharedNode)).toEqual(new Set([1, 2]));
    controller.detachExternalNode(inactiveBridge, sharedNode);
    expect(controller.nodeBridgeMembership.get(sharedNode)).toEqual(new Set([1]));

    controller.syncTelemetryLoop();
    controller.syncTelemetryLoop();
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(controller.telemetryTimer).not.toBeNull();

    controller.publishTelemetry();

    expect(telemetryEvents.at(-1)).toMatchObject({
      activeStrategy: "web_audio_bridge",
      level: Math.round(Math.max(0.22, 0.31 * 0.45) * 10000) / 10000,
      warning: deriveWarningFromMetrics(activeMetrics),
      metrics: {
        protectorActionDb: activeMetrics.protectorActionDb,
        clipEvents: activeMetrics.clipEvents,
        clipPeak: activeMetrics.clipPeak,
        protectionBypassed: activeMetrics.protectionBypassed,
        outputPeak: 0.22
      },
      audioContextCount: 2,
      attachedNodeCount: 1
    });

    controller.state.suspended = true;
    controller.syncTelemetryLoop();
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    expect(controller.telemetryTimer).toBeNull();

    controller.detachExternalNode(activeBridge, sharedNode);
    expect(controller.nodeBridgeMembership.get(sharedNode)).toBeUndefined();
  });

  it("keeps the global main-world entry side-effect-only so all-sites injection cannot break again", () => {
    const mainWorldSource = readFileSync(resolve(process.cwd(), "src/content/main-world.ts"), "utf8");
    const registeredMainSource = readFileSync(resolve(process.cwd(), "src/content/registered-main.ts"), "utf8");
    const registeredScriptConfigSource = readFileSync(
      resolve(process.cwd(), "vite.registered-content-scripts.config.ts"),
      "utf8"
    );

    expect(registeredMainSource).toContain('import "./main-world";');
    expect(mainWorldSource).not.toMatch(/^\s*export\s/m);
    expect(mainWorldSource).not.toContain("__PRISM_AUTO_BOOSTER_MAIN_WORLD_TESTABLES__");
    expect(mainWorldSource).not.toContain("export const __testables");
    expect(registeredScriptConfigSource).toContain('formats: ["iife"]');
    expect(registeredScriptConfigSource).toContain('"src/content/registered-main.ts"');
  });
});
