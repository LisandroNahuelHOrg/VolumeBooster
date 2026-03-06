import {
  applyQualityProtector,
  buildDspRuntimeParameters,
  createDefaultMetrics,
  deriveMetricsFromPeaks,
  deriveWarningFromMetrics,
  isProtectionBypassedSettings
} from "../shared/audio-settings";
import { METER_SAMPLE_MS } from "../shared/constants";
import type { AdvancedAudioSettings, AutoAttachReason, AutoAttachState, AutoBoosterConfigPayload, DspRuntimeMetrics, LevelWarning } from "../shared/types";
import {
  BRIDGE_COMMAND_EVENT,
  createBridgeDefaultMetrics,
  createBridgeStatusEvent,
  createBridgeTelemetryEvent,
  isBridgeEventDetail,
  type BridgeCommandPayload,
  type BridgeRuntimeMetrics,
  type BridgeStatusPayload
} from "./bridge-protocol";

declare global {
  interface Window {
    __PRISM_AUTO_BOOSTER_MAIN_WORLD_BOOTED__?: boolean;
    __PRISM_AUTO_BOOSTER_MAIN_IMPORT_PROMISE__?: Promise<unknown>;
    webkitAudioContext?: typeof AudioContext;
  }
}

type AudioContextConstructor = typeof AudioContext;

interface BridgeContextState {
  id: number;
  context: AudioContext;
  inputNode: GainNode;
  inputAnalyser: AnalyserNode;
  preGain: GainNode;
  lowShelf: BiquadFilterNode;
  midPeak: BiquadFilterNode;
  compressor: DynamicsCompressorNode;
  shaper: WaveShaperNode;
  outputAnalyser: AnalyserNode;
  wetGain: GainNode;
  dryGain: GainNode;
  internalNodes: WeakSet<AudioNode>;
  attachedNodes: Set<AudioNode>;
  lastMetrics: DspRuntimeMetrics;
}

interface BridgeControllerState {
  enabled: boolean;
  suspended: boolean;
  scope: AutoBoosterConfigPayload["scope"] | null;
  gainPercent: number;
  advancedAudioSettings: AdvancedAudioSettings | null;
}

const LOW_SHELF_FREQUENCY_HZ = 180;
const MID_PEAK_FREQUENCY_HZ = 1700;
const MID_PEAK_Q = 0.82;
const PROTECTION_DEPTH_ATTACK_FLOOR_SEC = 0.003;
const MAX_OUTPUT_GAIN_DB = 0;

class WebAudioBridgeController {
  private readonly bridgeStates = new WeakMap<AudioContext, BridgeContextState>();
  private readonly bridgeStateList: BridgeContextState[] = [];
  private readonly nodeBridgeMembership = new WeakMap<AudioNode, Set<number>>();
  private readonly contextIds = new WeakMap<AudioContext, number>();
  private readonly PatchedAudioContext = this.createPatchedAudioContext(window.AudioContext);
  private readonly PatchedWebkitAudioContext = window.webkitAudioContext
    ? this.createPatchedAudioContext(window.webkitAudioContext)
    : undefined;
  private readonly originalConnect = AudioNode.prototype.connect;
  private readonly originalDisconnect = AudioNode.prototype.disconnect;
  private telemetryTimer: number | null = null;
  private nextContextId = 1;
  private lastTechnicalError: string | undefined;
  private state: BridgeControllerState = {
    enabled: false,
    suspended: false,
    scope: null,
    gainPercent: 100,
    advancedAudioSettings: null
  };

  bootstrap(): void {
    this.patchConstructors();
    this.patchAudioNodePrototype();
    window.addEventListener(BRIDGE_COMMAND_EVENT, this.handleBridgeCommand as EventListener);
    this.syncTelemetryLoop();
    this.reportStatus();
  }

  private readonly handleBridgeCommand = (event: Event): void => {
    const customEvent = event as CustomEvent<unknown>;

    if (!isBridgeEventDetail<BridgeCommandPayload>(customEvent.detail)) {
      return;
    }

    const payload = customEvent.detail.payload;

    if (payload.type === "configure") {
      this.configure(payload.payload);
      return;
    }

    this.disable();
  };

  private configure(payload: AutoBoosterConfigPayload): void {
    this.state = {
      enabled: payload.enabled,
      suspended: payload.suspended,
      scope: payload.scope,
      gainPercent: payload.gainPercent,
      advancedAudioSettings: payload.advancedAudioSettings
    };
    this.lastTechnicalError = undefined;

    for (const bridgeState of this.bridgeStateList) {
      this.applyRuntimeParameters(bridgeState);
    }

    this.syncTelemetryLoop();
    this.reportStatus();
  }

  private disable(): void {
    this.state = {
      enabled: false,
      suspended: false,
      scope: null,
      gainPercent: 100,
      advancedAudioSettings: null
    };
    this.lastTechnicalError = undefined;

    for (const bridgeState of this.bridgeStateList) {
      this.applyBypassState(bridgeState);
    }

    this.syncTelemetryLoop();
    this.reportStatus();
  }

  private createPatchedAudioContext(
    Constructor: AudioContextConstructor
  ): AudioContextConstructor {

    const controller = this;

    class PatchedConstructor extends Constructor {
      constructor(...args: ConstructorParameters<AudioContextConstructor>) {
        super(...args);
        controller.registerContext(this as unknown as AudioContext);
      }
    }

    Object.defineProperty(PatchedConstructor, "name", {
      value: Constructor.name,
      configurable: true
    });
    PatchedConstructor.prototype = Constructor.prototype;
    Object.setPrototypeOf(PatchedConstructor, Constructor);

    return PatchedConstructor as AudioContextConstructor;
  }

  private patchConstructors(): void {
    if (window.AudioContext !== this.PatchedAudioContext) {
      window.AudioContext = this.PatchedAudioContext;
    }

    if (this.PatchedWebkitAudioContext && window.webkitAudioContext !== this.PatchedWebkitAudioContext) {
      window.webkitAudioContext = this.PatchedWebkitAudioContext;
    }
  }

  private patchAudioNodePrototype(): void {
    const controller = this;

    if (AudioNode.prototype.connect === controller.handlePatchedConnect) {
      return;
    }

    AudioNode.prototype.connect = controller.handlePatchedConnect as AudioNode["connect"];
    AudioNode.prototype.disconnect = controller.handlePatchedDisconnect as AudioNode["disconnect"];
  }

  private readonly handlePatchedConnect = function patchedConnect(
    this: AudioNode,
    destinationNode: AudioNode | AudioParam,
    output?: number,
    input?: number
  ): AudioNode {
    const bridgeState = bridgeController.resolveBridgeStateForNode(this);

    if (
      bridgeState &&
      destinationNode instanceof AudioNode &&
      destinationNode === bridgeState.context.destination &&
      !bridgeState.internalNodes.has(this)
    ) {
      bridgeController.attachExternalNode(bridgeState, this);
      return (bridgeController.originalConnect as unknown as (
        destination: AudioNode,
        output?: number,
        input?: number
      ) => AudioNode).call(this, bridgeState.inputNode, output, input);
    }

    return (bridgeController.originalConnect as unknown as (
      destination: AudioNode | AudioParam,
      output?: number,
      input?: number
    ) => AudioNode).call(this, destinationNode, output, input);
  };

  private readonly handlePatchedDisconnect = function patchedDisconnect(
    this: AudioNode,
    destinationNode?: AudioNode | AudioParam,
    output?: number,
    input?: number
  ): void {
    const bridgeState = bridgeController.resolveBridgeStateForNode(this);

    if (bridgeState && !bridgeState.internalNodes.has(this)) {
      if (destinationNode instanceof AudioNode && destinationNode === bridgeState.context.destination) {
        bridgeController.detachExternalNode(bridgeState, this);
        (bridgeController.originalDisconnect as unknown as (
          destination: AudioNode,
          output?: number,
          input?: number
        ) => void).call(this, bridgeState.inputNode, output, input);
        bridgeController.reportStatus();
        return;
      }

      if (destinationNode === undefined) {
        bridgeController.detachExternalNode(bridgeState, this);
      }
    }

    (bridgeController.originalDisconnect as unknown as (
      destination?: AudioNode | AudioParam,
      output?: number,
      input?: number
    ) => void).call(this, destinationNode, output, input);
    bridgeController.reportStatus();
  };

  private registerContext(context: AudioContext): void {
    if (this.bridgeStates.has(context)) {
      return;
    }

    const state = createBridgeState(context, this.nextContextId++);
    this.contextIds.set(context, state.id);
    this.bridgeStates.set(context, state);
    this.bridgeStateList.push(state);
    this.applyRuntimeParameters(state);
    void context.resume().catch(() => undefined);
    this.syncTelemetryLoop();
    this.reportStatus();
  }

  private resolveBridgeStateForNode(node: AudioNode): BridgeContextState | null {
    const context = node.context;

    if (!(context instanceof AudioContext)) {
      return null;
    }

    return this.bridgeStates.get(context) ?? null;
  }

  private attachExternalNode(bridgeState: BridgeContextState, node: AudioNode): void {
    bridgeState.attachedNodes.add(node);
    const memberships = this.nodeBridgeMembership.get(node) ?? new Set<number>();
    memberships.add(bridgeState.id);
    this.nodeBridgeMembership.set(node, memberships);
    this.syncTelemetryLoop();
    this.reportStatus();
  }

  private detachExternalNode(bridgeState: BridgeContextState, node: AudioNode): void {
    bridgeState.attachedNodes.delete(node);
    const memberships = this.nodeBridgeMembership.get(node);

    if (!memberships) {
      return;
    }

    memberships.delete(bridgeState.id);

    if (memberships.size === 0) {
      this.nodeBridgeMembership.delete(node);
    }

    this.syncTelemetryLoop();
    this.reportStatus();
  }

  private applyRuntimeParameters(bridgeState: BridgeContextState): void {
    if (!this.state.enabled || !this.state.advancedAudioSettings) {
      this.applyBypassState(bridgeState);
      return;
    }

    const runtime = applyQualityProtector(
      buildDspRuntimeParameters(this.state.gainPercent, this.state.advancedAudioSettings)
    );

    bridgeState.preGain.gain.value = dbToGain(runtime.inputDriveDb);
    bridgeState.lowShelf.type = "lowshelf";
    bridgeState.lowShelf.frequency.value = LOW_SHELF_FREQUENCY_HZ;
    bridgeState.lowShelf.gain.value = runtime.toneLowBandGainDb + runtime.lowBandTrimDb + runtime.lowBandMakeupDb;
    bridgeState.midPeak.type = "peaking";
    bridgeState.midPeak.frequency.value = MID_PEAK_FREQUENCY_HZ;
    bridgeState.midPeak.Q.value = MID_PEAK_Q;
    bridgeState.midPeak.gain.value =
      runtime.toneMidBandGainDb + runtime.clarityPresenceTiltDb - runtime.midHighThresholdOffsetDb * 0.08;
    bridgeState.compressor.threshold.value = clampNumber(
      -32 - runtime.multibandDepth * 0.14 + runtime.lowBandThresholdOffsetDb,
      -60,
      -6
    );
    bridgeState.compressor.knee.value = clampNumber(18 - runtime.lowBandRatioBias * 8, 0, 30);
    bridgeState.compressor.ratio.value = clampNumber(
      1.8 + runtime.multibandDepth * 0.11 + runtime.lowBandRatioBias * 2.4,
      1,
      20
    );
    bridgeState.compressor.attack.value = clampNumber(
      Math.max(runtime.lookaheadMs / 1000, PROTECTION_DEPTH_ATTACK_FLOOR_SEC),
      PROTECTION_DEPTH_ATTACK_FLOOR_SEC,
      0.2
    );
    bridgeState.compressor.release.value = clampNumber(runtime.releaseMs / 1000, 0.06, 1.2);
    bridgeState.shaper.curve = createSoftClipCurve(runtime.outputSoftClipMix) as any;
    bridgeState.wetGain.gain.value = this.state.suspended ? 0 : dbToGain(Math.min(MAX_OUTPUT_GAIN_DB, runtime.outputCeilingDb));
    bridgeState.dryGain.gain.value = this.state.suspended ? 1 : 0;
    bridgeState.lastMetrics = createDefaultMetrics(isProtectionBypassedSettings(this.state.advancedAudioSettings));
  }

  private applyBypassState(bridgeState: BridgeContextState): void {
    bridgeState.preGain.gain.value = 1;
    bridgeState.lowShelf.gain.value = 0;
    bridgeState.midPeak.gain.value = 0;
    bridgeState.compressor.threshold.value = -3;
    bridgeState.compressor.knee.value = 0;
    bridgeState.compressor.ratio.value = 1;
    bridgeState.compressor.attack.value = PROTECTION_DEPTH_ATTACK_FLOOR_SEC;
    bridgeState.compressor.release.value = 0.06;
    bridgeState.shaper.curve = createSoftClipCurve(0) as any;
    bridgeState.wetGain.gain.value = 0;
    bridgeState.dryGain.gain.value = 1;
    bridgeState.lastMetrics = createDefaultMetrics(true);
  }

  private syncTelemetryLoop(): void {
    const shouldRun =
      this.state.enabled &&
      !this.state.suspended &&
      this.state.advancedAudioSettings !== null &&
      this.bridgeStateList.some((bridgeState) => bridgeState.attachedNodes.size > 0);

    if (shouldRun && this.telemetryTimer === null) {
      this.telemetryTimer = window.setInterval(() => {
        this.publishTelemetry();
      }, METER_SAMPLE_MS);
      return;
    }

    if (!shouldRun && this.telemetryTimer !== null) {
      window.clearInterval(this.telemetryTimer);
      this.telemetryTimer = null;
    }
  }

  private publishTelemetry(): void {
    if (!this.state.enabled || this.state.suspended || !this.state.advancedAudioSettings) {
      return;
    }

    const activeBridgeStates = this.bridgeStateList.filter((bridgeState) => bridgeState.attachedNodes.size > 0);

    if (activeBridgeStates.length === 0) {
      return;
    }

    let highestLevel = 0;
    let highestWarning: LevelWarning = "none";
    let maxOutputPeak = 0;
    let maxClipPeak = 0;
    let clipEvents = 0;
    let maxProtectorActionDb = 0;
    let protectionBypassed = false;

    for (const bridgeState of activeBridgeStates) {
      const runtime = applyQualityProtector(
        buildDspRuntimeParameters(this.state.gainPercent, this.state.advancedAudioSettings)
      );
      const inputPeak = readPeak(bridgeState.inputAnalyser);
      const outputPeak = readPeak(bridgeState.outputAnalyser);
      const metrics = deriveMetricsFromPeaks(runtime, inputPeak, outputPeak, bridgeState.lastMetrics);
      const warning = deriveWarningFromMetrics(metrics);
      const level = roundTo(Math.min(1, Math.max(outputPeak, inputPeak * 0.45)), 4);
      bridgeState.lastMetrics = metrics;
      highestLevel = Math.max(highestLevel, level);
      highestWarning = pickHighestWarning(highestWarning, warning);
      maxOutputPeak = Math.max(maxOutputPeak, outputPeak);
      maxClipPeak = Math.max(maxClipPeak, metrics.clipPeak);
      clipEvents += metrics.clipEvents;
      maxProtectorActionDb = Math.max(maxProtectorActionDb, metrics.protectorActionDb);
      protectionBypassed = protectionBypassed || metrics.protectionBypassed;
    }

    const payload = {
      activeStrategy: "web_audio_bridge" as const,
      level: roundTo(highestLevel, 4),
      warning: highestWarning,
      metrics: {
        protectorActionDb: roundTo(maxProtectorActionDb, 2),
        clipEvents,
        clipPeak: roundTo(maxClipPeak, 4),
        protectionBypassed,
        outputPeak: roundTo(maxOutputPeak, 4)
      } satisfies BridgeRuntimeMetrics,
      audioContextCount: this.bridgeStateList.length,
      attachedNodeCount: activeBridgeStates.reduce((sum, bridgeState) => sum + bridgeState.attachedNodes.size, 0),
      lastTelemetryAt: Date.now()
    };

    window.dispatchEvent(createBridgeTelemetryEvent(payload));
  }

  private buildStatusPayload(): BridgeStatusPayload {
    const attachedNodeCount = this.bridgeStateList.reduce((sum, bridgeState) => sum + bridgeState.attachedNodes.size, 0);
    const activeContexts = this.bridgeStateList.filter((bridgeState) => bridgeState.attachedNodes.size > 0);
    const audioContextState = activeContexts[0]?.context.state ?? this.bridgeStateList[0]?.context.state ?? "none";
    const autoplayPolicy = activeContexts[0]
      ? getAutoplayPolicy(activeContexts[0].context)
      : this.bridgeStateList[0]
        ? getAutoplayPolicy(this.bridgeStateList[0].context)
        : undefined;
    let attachState: AutoAttachState = "idle";
    let attachReason: AutoAttachReason | undefined;

    if (this.state.enabled) {
      if (attachedNodeCount > 0) {
        attachState = audioContextState === "suspended" ? "awaiting_user_gesture" : "attached";
        attachReason = attachState === "awaiting_user_gesture" ? "autoplay_blocked" : undefined;
      } else if (this.bridgeStateList.length > 0 && audioContextState === "suspended") {
        attachState = "awaiting_user_gesture";
        attachReason = "autoplay_blocked";
      } else {
        attachState = "observing";
        attachReason = "no_media";
      }
    }

    return {
      enabled: this.state.enabled,
      suspended: this.state.suspended,
      scope: this.state.scope,
      attachState,
      attachReason,
      activeStrategy: attachedNodeCount > 0 ? "web_audio_bridge" : "none",
      audioContextState,
      autoplayPolicy,
      audioContextCount: this.bridgeStateList.length,
      attachedNodeCount,
      lastTechnicalError: this.lastTechnicalError,
      currentUrl: window.location.href
    };
  }

  private reportStatus(): void {
    window.dispatchEvent(createBridgeStatusEvent(this.buildStatusPayload()));
  }
}

const bridgeController = new WebAudioBridgeController();

if (!window.__PRISM_AUTO_BOOSTER_MAIN_WORLD_BOOTED__) {
  window.__PRISM_AUTO_BOOSTER_MAIN_WORLD_BOOTED__ = true;
  bridgeController.bootstrap();
}

function createBridgeState(context: AudioContext, id: number): BridgeContextState {
  const inputNode = context.createGain();
  const inputAnalyser = createAnalyser(context);
  const preGain = context.createGain();
  const lowShelf = context.createBiquadFilter();
  const midPeak = context.createBiquadFilter();
  const compressor = context.createDynamicsCompressor();
  const shaper = context.createWaveShaper();
  const outputAnalyser = createAnalyser(context);
  const wetGain = context.createGain();
  const dryGain = context.createGain();
  const internalNodes = new WeakSet<AudioNode>();

  for (const node of [
    inputNode,
    inputAnalyser,
    preGain,
    lowShelf,
    midPeak,
    compressor,
    shaper,
    outputAnalyser,
    wetGain,
    dryGain
  ]) {
    internalNodes.add(node);
  }

  inputNode.connect(inputAnalyser);
  inputAnalyser.connect(preGain);
  preGain.connect(lowShelf);
  lowShelf.connect(midPeak);
  midPeak.connect(compressor);
  compressor.connect(shaper);
  shaper.connect(outputAnalyser);
  outputAnalyser.connect(wetGain);
  wetGain.connect(context.destination);
  inputNode.connect(dryGain);
  dryGain.connect(context.destination);

  return {
    id,
    context,
    inputNode,
    inputAnalyser,
    preGain,
    lowShelf,
    midPeak,
    compressor,
    shaper,
    outputAnalyser,
    wetGain,
    dryGain,
    internalNodes,
    attachedNodes: new Set<AudioNode>(),
    lastMetrics: createDefaultMetrics(true)
  };
}

function createAnalyser(context: AudioContext): AnalyserNode {
  const analyser = context.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.04;
  return analyser;
}

function createSoftClipCurve(intensity: number): Float32Array {
  const curve = new Float32Array(1024);
  const drive = 1 + intensity / 6;

  for (let index = 0; index < curve.length; index += 1) {
    const x = (index / (curve.length - 1)) * 2 - 1;
    curve[index] = Math.tanh(x * drive);
  }

  return curve;
}

function readPeak(analyser: AnalyserNode): number {
  const buffer = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(buffer);
  let peak = 0;

  for (const sample of buffer) {
    peak = Math.max(peak, Math.abs(sample));
  }

  return roundTo(peak, 4);
}

function getAutoplayPolicy(audioContext: AudioContext): string | undefined {
  const policyApi = (
    navigator as Navigator & {
      getAutoplayPolicy?: (target?: string | AudioContext | HTMLMediaElement) => string;
    }
  ).getAutoplayPolicy;

  if (typeof policyApi !== "function") {
    return undefined;
  }

  try {
    return policyApi(audioContext);
  } catch {
    try {
      return policyApi("audiocontext");
    } catch {
      return undefined;
    }
  }
}

function dbToGain(decibels: number): number {
  return Math.pow(10, decibels / 20);
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

function pickHighestWarning(current: LevelWarning, next: LevelWarning): LevelWarning {
  if (current === "danger" || next === "danger") {
    return "danger";
  }

  if (current === "high" || next === "high") {
    return "high";
  }

  return "none";
}
