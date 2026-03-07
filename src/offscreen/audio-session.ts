/**
 * @fileoverview Sesión robusta de captura por pestaña usando `tabCapture` y el
 * engine premium Faust dentro del documento offscreen.
 */
import { FaustMonoAudioWorkletNode } from "@grame/faustwasm";
import { METER_SAMPLE_MS } from "../shared/constants";
import {
  applyQualityProtector,
  buildDspRuntimeParameters,
  createDefaultMetrics,
  deriveMetricsFromPeaks,
  deriveWarningFromMetrics,
  isProtectionBypassedSettings
} from "../shared/audio-settings";
import type {
  AdvancedAudioSettings,
  DspRuntimeMetrics,
  LevelWarning
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
}

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
  private meterIntervalId: number | null = null;
  private currentAsset: FaustAssetDescriptor = MONO_FAUST_ASSET;
  private currentGainPercent: number;
  private currentSettings: AdvancedAudioSettings;
  private latestMetrics: DspRuntimeMetrics = createDefaultMetrics();

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
      this.latestMetrics = createDefaultMetrics();
      this.emitTelemetry(0, "danger", this.latestMetrics);
    });

    sourceNode.connect(inputAnalyserNode);
    inputAnalyserNode.connect(faustNode);
    faustNode.connect(outputAnalyserNode);
    outputAnalyserNode.connect(audioContext.destination);

    this.stream = mediaStream;
    this.audioContext = audioContext;
    this.sourceNode = sourceNode;
    this.inputAnalyserNode = inputAnalyserNode;
    this.outputAnalyserNode = outputAnalyserNode;
    this.faustNode = faustNode;
    this.currentAsset = currentAsset;

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

    this.outputAnalyserNode?.disconnect();
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
    this.latestMetrics = createDefaultMetrics();
  }

  /**
   * Aplica el runtime DSP actual al nodo Faust activo de la sesión.
   */
  private applyRuntimeParameters(): void {
    if (!this.faustNode) {
      return;
    }

    const runtime = applyQualityProtector(
      buildDspRuntimeParameters(this.currentGainPercent, this.currentSettings)
    );
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
