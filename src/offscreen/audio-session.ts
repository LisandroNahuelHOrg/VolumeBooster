/**
 * @fileoverview Sesión robusta de captura por pestaña usando `tabCapture` y el
 * engine premium Faust dentro del documento offscreen.
 */
import { FaustMonoAudioWorkletNode } from "@grame/faustwasm";
import { METER_SAMPLE_MS } from "../shared/constants";
import { message } from "../shared/messages";
import {
  applyQualityProtector,
  buildDspRuntimeParameters,
  createDefaultMetrics,
  deriveMetricsFromPeaks,
  deriveWarningFromMetrics,
  isProtectionBypassedSettings,
  type DspRuntimeParameters
} from "../shared/audio-settings";
import type {
  AdvancedAudioSettings,
  DspRuntimeMetrics,
  LevelWarning,
  LocalizedMessage
} from "../shared/types";
import { MONO_FAUST_ASSET, selectFaustAsset, type FaustAssetDescriptor } from "./faust-assets";

type TabAudioTrackConstraints = MediaTrackConstraints & {
  mandatory: {
    chromeMediaSource: "tab";
    chromeMediaSourceId: string;
  };
};

export interface AudioTelemetryPayload {
  level: number;
  warning: LevelWarning;
  metrics: DspRuntimeMetrics;
}

/**
 * Callbacks emitidos por la sesión robusta para reportar telemetría al
 * manager.
 */
export interface AudioSessionCallbacks {
  onTelemetry: (payload: AudioTelemetryPayload) => void;
  onFatalError?: (errorMessage: LocalizedMessage) => void;
}

type AudioEngineStrategy = "faust" | "native_fallback";

interface NativeFallbackGraph {
  preGain: GainNode;
  lowShelf: BiquadFilterNode;
  midPeak: BiquadFilterNode;
  compressor: DynamicsCompressorNode;
  shaper: WaveShaperNode;
  wetGain: GainNode;
  dryGain: GainNode;
}

const LOW_SHELF_FREQUENCY_HZ = 180;
const MID_PEAK_FREQUENCY_HZ = 1700;
const MID_PEAK_Q = 0.82;
const PROTECTION_DEPTH_ATTACK_FLOOR_SEC = 0.003;
const MAX_OUTPUT_GAIN_DB = 0;
const FAUST_RECOVERY_RETRY_MS = 15000;

/**
 * Encapsula una captura robusta de audio de pestaña basada en `tabCapture`.
 */
export class AudioSession {
  private static readonly loadedWorkletModules = new WeakMap<BaseAudioContext, Set<string>>();
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private inputAnalyserNode: AnalyserNode | null = null;
  private outputAnalyserNode: AnalyserNode | null = null;
  private faustNode: FaustMonoAudioWorkletNode | null = null;
  private fallbackGraph: NativeFallbackGraph | null = null;
  private meterIntervalId: number | null = null;
  private faustRecoveryIntervalId: number | null = null;
  private currentAsset: FaustAssetDescriptor = MONO_FAUST_ASSET;
  private currentGainPercent: number;
  private currentSettings: AdvancedAudioSettings;
  private latestMetrics: DspRuntimeMetrics = createDefaultMetrics();
  private fatalErrorNotified = false;
  private faustRecoveryInFlight = false;
  private engineStrategy: AudioEngineStrategy = "faust";

  constructor(
    gainPercent: number,
    advancedAudioSettings: AdvancedAudioSettings,
    private readonly callbacks: AudioSessionCallbacks
  ) {
    this.currentGainPercent = gainPercent;
    this.currentSettings = advancedAudioSettings;
    this.latestMetrics = createDefaultMetrics(isProtectionBypassedSettings(advancedAudioSettings));
  }

  /**
   * Inicia la captura a partir de un `streamId` emitido por `chrome.tabCapture`.
   */
  async start(streamId: string): Promise<void> {
    this.fatalErrorNotified = false;
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId
        }
      } as TabAudioTrackConstraints,
      video: false
    });

    const audioContext = new AudioContext();
    const sourceNode = audioContext.createMediaStreamSource(mediaStream);
    const inputAnalyserNode = createAnalyser(audioContext);
    const outputAnalyserNode = createAnalyser(audioContext);
    const currentAsset = selectFaustAsset(mediaStream.getAudioTracks()[0]?.getSettings?.().channelCount);

    this.stream = mediaStream;
    this.audioContext = audioContext;
    this.sourceNode = sourceNode;
    this.inputAnalyserNode = inputAnalyserNode;
    this.outputAnalyserNode = outputAnalyserNode;
    this.currentAsset = currentAsset;

    sourceNode.connect(inputAnalyserNode);

    try {
      await this.connectFaustGraph(audioContext, inputAnalyserNode, outputAnalyserNode, currentAsset);
      this.engineStrategy = "faust";
    } catch {
      try {
        this.activateNativeFallbackGraph(audioContext, inputAnalyserNode, outputAnalyserNode);
        this.engineStrategy = "native_fallback";
      } catch {
        this.handleFatalError(message("errorAudioPipelineStart"));
        await this.stop().catch(() => undefined);
        throw new Error("The manual audio session could not initialize either Faust or the native fallback.");
      }
    }

    this.applyRuntimeParameters();
    await audioContext.resume();
    this.startMeter();
  }

  /**
   * Actualiza el boost actual y reaplica la configuración DSP.
   */
  setGainPercent(gainPercent: number): void {
    this.currentGainPercent = gainPercent;
    this.latestMetrics = createDefaultMetrics(isProtectionBypassedSettings(this.currentSettings));
    this.applyRuntimeParameters();
    this.emitCurrentTelemetry();
  }

  /**
   * Actualiza los ajustes avanzados del engine premium.
   */
  setAdvancedAudioSettings(settings: AdvancedAudioSettings): void {
    this.currentSettings = settings;
    this.latestMetrics = createDefaultMetrics(isProtectionBypassedSettings(settings));
    this.applyRuntimeParameters();
    this.emitCurrentTelemetry();
  }

  /**
   * Detiene la captura, libera tracks y cierra el `AudioContext`.
   */
  async stop(): Promise<void> {
    if (this.meterIntervalId !== null) {
      window.clearInterval(this.meterIntervalId);
      this.meterIntervalId = null;
    }

    this.cancelFaustRecovery();

    this.outputAnalyserNode?.disconnect();
    disconnectNativeFallbackGraph(this.fallbackGraph);
    this.faustNode?.disconnect();
    this.inputAnalyserNode?.disconnect();
    this.sourceNode?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());

    if (this.audioContext && this.audioContext.state !== "closed") {
      await this.audioContext.close();
    }

    this.stream = null;
    this.audioContext = null;
    this.sourceNode = null;
    this.inputAnalyserNode = null;
    this.outputAnalyserNode = null;
    this.faustNode = null;
    this.fallbackGraph = null;
    this.latestMetrics = createDefaultMetrics();
    this.fatalErrorNotified = false;
    this.faustRecoveryInFlight = false;
    this.engineStrategy = "faust";
  }

  /**
   * Aplica el runtime DSP actual al nodo Faust activo de la sesión.
   */
  private applyRuntimeParameters(): void {
    const runtime = applyQualityProtector(
      buildDspRuntimeParameters(this.currentGainPercent, this.currentSettings)
    );

    if (this.engineStrategy === "faust" && this.faustNode) {
      this.applyFaustRuntimeParameters(runtime);
      return;
    }

    if (this.fallbackGraph) {
      applyNativeFallbackRuntimeParameters(this.fallbackGraph, runtime);
    }
  }

  /**
   * Publica la telemetría actual sin esperar al próximo tick del medidor.
   */
  private emitCurrentTelemetry(): void {
    if (!this.inputAnalyserNode || !this.outputAnalyserNode) {
      return;
    }

    this.publishTelemetry(this.inputAnalyserNode, this.outputAnalyserNode);
  }

  /**
   * Arranca el muestreo periódico del nivel de audio de la sesión.
   */
  private startMeter(): void {
    if (!this.inputAnalyserNode || !this.outputAnalyserNode) {
      return;
    }

    const inputAnalyserNode = this.inputAnalyserNode;
    const outputAnalyserNode = this.outputAnalyserNode;

    this.meterIntervalId = window.setInterval(() => {
      this.publishTelemetry(inputAnalyserNode, outputAnalyserNode);
    }, METER_SAMPLE_MS);
  }

  /**
   * Deriva telemetría de entrada/salida y la envía al callback del manager.
   */
  private publishTelemetry(inputAnalyserNode: AnalyserNode, outputAnalyserNode: AnalyserNode): void {
    const runtime = applyQualityProtector(
      buildDspRuntimeParameters(this.currentGainPercent, this.currentSettings)
    );
    const inputPeak = readPeak(inputAnalyserNode);
    const outputPeak = readPeak(outputAnalyserNode);
    const metrics = deriveMetricsFromPeaks(runtime, inputPeak, outputPeak, this.latestMetrics);
    const warning = deriveWarningFromMetrics(metrics);
    const level = roundTo(Math.min(1, Math.max(outputPeak, inputPeak * 0.45)), 4);

    this.latestMetrics = metrics;
    this.emitTelemetry(level, warning, metrics);
  }

  private emitTelemetry(level: number, warning: LevelWarning, metrics: DspRuntimeMetrics): void {
    this.callbacks.onTelemetry({
      level,
      warning,
      metrics
    });
  }

  private handleFatalError(errorMessage: LocalizedMessage): void {
    if (this.fatalErrorNotified) {
      return;
    }

    this.fatalErrorNotified = true;
    this.latestMetrics = createDefaultMetrics(isProtectionBypassedSettings(this.currentSettings));
    this.emitTelemetry(0, "danger", this.latestMetrics);
    this.callbacks.onFatalError?.(errorMessage);
  }

  private async connectFaustGraph(
    audioContext: AudioContext,
    inputAnalyserNode: AnalyserNode,
    outputAnalyserNode: AnalyserNode,
    currentAsset: FaustAssetDescriptor
  ): Promise<void> {
    await AudioSession.ensureWorkletModule(audioContext, currentAsset.workletModulePath);
    const factory = await currentAsset.loadFactory();
    const faustNode = new FaustMonoAudioWorkletNode(audioContext, {
      processorOptions: {
        name: currentAsset.processorName,
        factory,
        sampleSize: getSampleSize(currentAsset.meta)
      }
    });

    faustNode.addEventListener("processorerror", () => {
      this.activateNativeFallbackFromFaust();
    });

    inputAnalyserNode.connect(faustNode);
    faustNode.connect(outputAnalyserNode);
    outputAnalyserNode.connect(audioContext.destination);
    this.faustNode = faustNode;
    this.fallbackGraph = null;
    this.cancelFaustRecovery();
  }

  private activateNativeFallbackFromFaust(): void {
    if (
      this.engineStrategy === "native_fallback" ||
      !this.audioContext ||
      !this.inputAnalyserNode ||
      !this.outputAnalyserNode
    ) {
      return;
    }

    try {
      this.outputAnalyserNode.disconnect();
      this.faustNode?.disconnect();
      this.inputAnalyserNode.disconnect();
      this.sourceNode?.disconnect();
      this.sourceNode?.connect(this.inputAnalyserNode);
      this.activateNativeFallbackGraph(this.audioContext, this.inputAnalyserNode, this.outputAnalyserNode);
      this.engineStrategy = "native_fallback";
      this.applyRuntimeParameters();
      this.emitCurrentTelemetry();
    } catch {
      this.handleFatalError(message("errorAudioPipelineStart"));
    }
  }

  private activateNativeFallbackGraph(
    audioContext: AudioContext,
    inputAnalyserNode: AnalyserNode,
    outputAnalyserNode: AnalyserNode
  ): void {
    const fallbackGraph = createNativeFallbackGraph(audioContext, inputAnalyserNode, outputAnalyserNode);
    this.faustNode = null;
    this.fallbackGraph = fallbackGraph;
    this.scheduleFaustRecovery();
  }

  private applyFaustRuntimeParameters(runtime: DspRuntimeParameters): void {
    if (!this.faustNode) {
      return;
    }

    this.faustNode.setParamValue(this.currentAsset.controlPaths.inputDriveDb, runtime.inputDriveDb);
    this.faustNode.setParamValue(this.currentAsset.controlPaths.lookaheadMs, runtime.lookaheadMs);
    this.faustNode.setParamValue(this.currentAsset.controlPaths.releaseMs, runtime.releaseMs);
    this.faustNode.setParamValue(this.currentAsset.controlPaths.multibandDepth, runtime.multibandDepth);
    this.faustNode.setParamValue(this.currentAsset.controlPaths.protectorEnabled, runtime.protectorEnabled ? 1 : 0);
    this.faustNode.setParamValue(
      this.currentAsset.controlPaths.outputLimiterEnabled,
      runtime.outputLimiterEnabled ? 1 : 0
    );
    this.faustNode.setParamValue(this.currentAsset.controlPaths.lowBandTrimDb, runtime.lowBandTrimDb);
    this.faustNode.setParamValue(this.currentAsset.controlPaths.lowBandMakeupDb, runtime.lowBandMakeupDb);
    this.faustNode.setParamValue(
      this.currentAsset.controlPaths.lowBandThresholdOffsetDb,
      runtime.lowBandThresholdOffsetDb
    );
    this.faustNode.setParamValue(this.currentAsset.controlPaths.lowBandRatioBias, runtime.lowBandRatioBias);
    this.faustNode.setParamValue(
      this.currentAsset.controlPaths.midHighThresholdOffsetDb,
      runtime.midHighThresholdOffsetDb
    );
    this.faustNode.setParamValue(this.currentAsset.controlPaths.outputCeilingDb, runtime.outputCeilingDb);
    this.faustNode.setParamValue(this.currentAsset.controlPaths.outputSoftClipMix, runtime.outputSoftClipMix);
    this.faustNode.setParamValue(
      this.currentAsset.controlPaths.clarityPresenceTiltDb,
      runtime.clarityPresenceTiltDb
    );
    this.faustNode.setParamValue(this.currentAsset.controlPaths.toneLowBandGainDb, runtime.toneLowBandGainDb);
    this.faustNode.setParamValue(this.currentAsset.controlPaths.toneMidBandGainDb, runtime.toneMidBandGainDb);
  }

  private scheduleFaustRecovery(): void {
    if (this.faustRecoveryIntervalId !== null) {
      return;
    }

    this.faustRecoveryIntervalId = window.setInterval(() => {
      void this.attemptFaustRecovery();
    }, FAUST_RECOVERY_RETRY_MS);
  }

  private cancelFaustRecovery(): void {
    if (this.faustRecoveryIntervalId !== null) {
      window.clearInterval(this.faustRecoveryIntervalId);
      this.faustRecoveryIntervalId = null;
    }

    this.faustRecoveryInFlight = false;
  }

  private async attemptFaustRecovery(): Promise<void> {
    if (
      this.engineStrategy !== "native_fallback" ||
      this.faustRecoveryInFlight ||
      !this.audioContext ||
      !this.inputAnalyserNode ||
      !this.outputAnalyserNode
    ) {
      return;
    }

    this.faustRecoveryInFlight = true;

    try {
      this.outputAnalyserNode.disconnect();
      this.inputAnalyserNode.disconnect();
      disconnectNativeFallbackGraph(this.fallbackGraph);
      this.fallbackGraph = null;
      await this.connectFaustGraph(
        this.audioContext,
        this.inputAnalyserNode,
        this.outputAnalyserNode,
        this.currentAsset
      );
      this.engineStrategy = "faust";
      this.applyRuntimeParameters();
      this.emitCurrentTelemetry();
    } catch {
      try {
        this.activateNativeFallbackGraph(this.audioContext, this.inputAnalyserNode, this.outputAnalyserNode);
        this.engineStrategy = "native_fallback";
        this.applyRuntimeParameters();
      } catch {
        this.handleFatalError(message("errorAudioPipelineStart"));
      }
    } finally {
      this.faustRecoveryInFlight = false;
    }
  }

  private static async ensureWorkletModule(
    audioContext: BaseAudioContext,
    modulePath: string
  ): Promise<void> {
    const loadedModules = AudioSession.loadedWorkletModules.get(audioContext) ?? new Set<string>();

    if (loadedModules.has(modulePath)) {
      return;
    }

    await audioContext.audioWorklet.addModule(chrome.runtime.getURL(modulePath));
    loadedModules.add(modulePath);
    AudioSession.loadedWorkletModules.set(audioContext, loadedModules);
  }
}

/**
 * Crea un analyser con la calibración usada por el popup en tiempo real.
 */
function createAnalyser(audioContext: AudioContext): AnalyserNode {
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.04;
  return analyser;
}

/**
 * Determina el sample size esperado por el worklet Faust compilado.
 */
function getSampleSize(meta: { compile_options: string }): 4 | 8 {
  return meta.compile_options.includes("-double") ? 8 : 4;
}

/**
 * Lee el pico actual absoluto de un analyser de dominio temporal.
 */
function readPeak(analyserNode: AnalyserNode): number {
  const buffer = new Float32Array(analyserNode.fftSize);
  analyserNode.getFloatTimeDomainData(buffer);

  let peak = 0;

  for (const value of buffer) {
    peak = Math.max(peak, Math.abs(value));
  }

  return roundTo(peak, 4);
}

/**
 * Redondea un valor con la precisión dada.
 */
function roundTo(value: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

function createNativeFallbackGraph(
  audioContext: AudioContext,
  inputAnalyserNode: AnalyserNode,
  outputAnalyserNode: AnalyserNode
): NativeFallbackGraph {
  const preGain = audioContext.createGain();
  const lowShelf = audioContext.createBiquadFilter();
  const midPeak = audioContext.createBiquadFilter();
  const compressor = audioContext.createDynamicsCompressor();
  const shaper = audioContext.createWaveShaper();
  const wetGain = audioContext.createGain();
  const dryGain = audioContext.createGain();

  inputAnalyserNode.connect(preGain);
  preGain.connect(lowShelf);
  lowShelf.connect(midPeak);
  midPeak.connect(compressor);
  compressor.connect(shaper);
  shaper.connect(outputAnalyserNode);
  outputAnalyserNode.connect(wetGain);
  wetGain.connect(audioContext.destination);
  inputAnalyserNode.connect(dryGain);
  dryGain.connect(audioContext.destination);

  return {
    preGain,
    lowShelf,
    midPeak,
    compressor,
    shaper,
    wetGain,
    dryGain
  };
}

function disconnectNativeFallbackGraph(fallbackGraph: NativeFallbackGraph | null): void {
  if (!fallbackGraph) {
    return;
  }

  fallbackGraph.dryGain.disconnect();
  fallbackGraph.wetGain.disconnect();
  fallbackGraph.shaper.disconnect();
  fallbackGraph.compressor.disconnect();
  fallbackGraph.midPeak.disconnect();
  fallbackGraph.lowShelf.disconnect();
  fallbackGraph.preGain.disconnect();
}

function applyNativeFallbackRuntimeParameters(
  fallbackGraph: NativeFallbackGraph,
  runtime: DspRuntimeParameters
): void {
  fallbackGraph.preGain.gain.value = dbToGain(runtime.inputDriveDb);
  fallbackGraph.lowShelf.type = "lowshelf";
  fallbackGraph.lowShelf.frequency.value = LOW_SHELF_FREQUENCY_HZ;
  fallbackGraph.lowShelf.gain.value =
    runtime.toneLowBandGainDb + runtime.lowBandTrimDb + runtime.lowBandMakeupDb;
  fallbackGraph.midPeak.type = "peaking";
  fallbackGraph.midPeak.frequency.value = MID_PEAK_FREQUENCY_HZ;
  fallbackGraph.midPeak.Q.value = MID_PEAK_Q;
  fallbackGraph.midPeak.gain.value =
    runtime.toneMidBandGainDb + runtime.clarityPresenceTiltDb - runtime.midHighThresholdOffsetDb * 0.08;
  fallbackGraph.compressor.threshold.value = clampNumber(
    -32 - runtime.multibandDepth * 0.14 + runtime.lowBandThresholdOffsetDb,
    -60,
    -6
  );
  fallbackGraph.compressor.knee.value = clampNumber(18 - runtime.lowBandRatioBias * 8, 0, 30);
  fallbackGraph.compressor.ratio.value = clampNumber(
    1.8 + runtime.multibandDepth * 0.11 + runtime.lowBandRatioBias * 2.4,
    1,
    20
  );
  fallbackGraph.compressor.attack.value = clampNumber(
    Math.max(runtime.lookaheadMs / 1000, PROTECTION_DEPTH_ATTACK_FLOOR_SEC),
    PROTECTION_DEPTH_ATTACK_FLOOR_SEC,
    0.2
  );
  fallbackGraph.compressor.release.value = clampNumber(runtime.releaseMs / 1000, 0.06, 1.2);
  fallbackGraph.shaper.curve = createSoftClipCurve(runtime.outputSoftClipMix);
  fallbackGraph.wetGain.gain.value = dbToGain(Math.min(MAX_OUTPUT_GAIN_DB, runtime.outputCeilingDb));
  fallbackGraph.dryGain.gain.value = 0;
}

function createSoftClipCurve(intensity: number): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(
    new ArrayBuffer(1024 * Float32Array.BYTES_PER_ELEMENT)
  ) as Float32Array<ArrayBuffer>;
  const drive = 1 + intensity / 6;

  for (let index = 0; index < curve.length; index += 1) {
    const x = (index / (curve.length - 1)) * 2 - 1;
    curve[index] = Math.tanh(x * drive);
  }

  return curve;
}

function dbToGain(decibels: number): number {
  return Math.pow(10, decibels / 20);
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const audioSessionTestables = {
  createAnalyser,
  getSampleSize,
  readPeak,
  roundTo,
  createNativeFallbackGraph,
  disconnectNativeFallbackGraph,
  applyNativeFallbackRuntimeParameters,
  createSoftClipCurve,
  dbToGain,
  clampNumber
};

if (import.meta.env.MODE === "test") {
  Object.defineProperty(AudioSession, "__testables", {
    value: audioSessionTestables,
    configurable: true
  });
}
