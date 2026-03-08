/**
 * @fileoverview Encapsula una sesión automática sobre un `HTMLMediaElement`
 * usando Web Audio + Faust para el modo `All sites`.
 */
import { FaustMonoAudioWorkletNode } from "@grame/faustwasm";
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
  AutoAttachReason,
  DspRuntimeMetrics,
  LevelWarning
} from "../shared/types";
import { selectFaustAsset, type FaustAssetDescriptor } from "../offscreen/faust-assets";
import { getRuntimeUrlSafe } from "./runtime-api";

export interface MediaElementTelemetry {
  level: number;
  warning: LevelWarning;
  metrics: DspRuntimeMetrics;
}

/**
 * Estado mínimo de depuración útil para diagnosticar bloqueos de autoplay o
 * problemas de audio context.
 */
export interface MediaElementSessionDebugState {
  audioContextState: AudioContextState | "none";
  autoplayPolicy?: string;
}

/**
 * Error tipado de creación/operación de una sesión automática sobre un media
 * element.
 */
export class MediaElementSessionError extends Error {
  constructor(
    readonly reason: AutoAttachReason,
    readonly technicalMessage?: string,
    readonly debugState?: MediaElementSessionDebugState
  ) {
    super(technicalMessage ?? reason);
    this.name = "MediaElementSessionError";
  }
}

/**
 * Mantiene el grafo Web Audio/Faust asociado a un único `HTMLMediaElement`.
 */
export class MediaElementSession {
  private static readonly loadedWorkletModules = new WeakMap<BaseAudioContext, Set<string>>();
  private readonly audioContext: AudioContext;
  private readonly sourceNode: MediaElementAudioSourceNode;
  private readonly inputAnalyserNode: AnalyserNode;
  private readonly outputAnalyserNode: AnalyserNode;
  private readonly wetGainNode: GainNode;
  private readonly bypassGainNode: GainNode;
  private readonly faustNode: FaustMonoAudioWorkletNode;
  private readonly asset: FaustAssetDescriptor;
  private currentGainPercent: number;
  private currentSettings: AdvancedAudioSettings;
  private latestMetrics: DspRuntimeMetrics;
  private processingEnabled = true;

  private constructor(
    private readonly mediaElement: HTMLMediaElement,
    gainPercent: number,
    advancedAudioSettings: AdvancedAudioSettings,
    audioContext: AudioContext,
    sourceNode: MediaElementAudioSourceNode,
    inputAnalyserNode: AnalyserNode,
    outputAnalyserNode: AnalyserNode,
    wetGainNode: GainNode,
    bypassGainNode: GainNode,
    faustNode: FaustMonoAudioWorkletNode,
    asset: FaustAssetDescriptor
  ) {
    this.currentGainPercent = gainPercent;
    this.currentSettings = advancedAudioSettings;
    this.audioContext = audioContext;
    this.sourceNode = sourceNode;
    this.inputAnalyserNode = inputAnalyserNode;
    this.outputAnalyserNode = outputAnalyserNode;
    this.wetGainNode = wetGainNode;
    this.bypassGainNode = bypassGainNode;
    this.faustNode = faustNode;
    this.asset = asset;
    this.latestMetrics = createDefaultMetrics(isProtectionBypassedSettings(advancedAudioSettings));
  }

  /**
   * Crea una sesión completamente inicializada para un `audio` o `video`
   * concreto.
   */
  static async create(
    mediaElement: HTMLMediaElement,
    gainPercent: number,
    advancedAudioSettings: AdvancedAudioSettings
  ): Promise<MediaElementSession> {
    const mediaAutoplayPolicy = getMediaAutoplayPolicy(mediaElement);
    const mediaAutoplayPolicyKnown = typeof mediaAutoplayPolicy === "string";
    const autoplayPolicyAllowsCreateWithoutGesture =
      mediaAutoplayPolicyKnown && isAutoplayPolicyAllowed(mediaAutoplayPolicy);

    if (!hasRecentUserGesture() && !autoplayPolicyAllowsCreateWithoutGesture) {
      throw new MediaElementSessionError(
        "autoplay_blocked",
        `AudioContext autoplay policy requires user gesture (${mediaAutoplayPolicy ?? "unknown"}).`,
        {
          audioContextState: "none",
          autoplayPolicy: mediaAutoplayPolicy
        }
      );
    }

    let audioContext: AudioContext;

    try {
      audioContext = new AudioContext();
    } catch (error) {
      throw new MediaElementSessionError(
        "autoplay_blocked",
        `AudioContext was not allowed to start. ${(error instanceof Error ? error.message : "Unknown startup error.")}`,
        {
          audioContextState: "none",
          autoplayPolicy: mediaAutoplayPolicy
        }
      );
    }

    const audioContextAutoplayPolicy = getAudioContextAutoplayPolicy(audioContext);

    if (!isAutoplayPolicyAllowed(audioContextAutoplayPolicy)) {
      await audioContext.close().catch(() => undefined);
      throw new MediaElementSessionError(
        "autoplay_blocked",
        `AudioContext autoplay policy is disallowed (${audioContextAutoplayPolicy}).`,
        createDebugState(audioContext, audioContextAutoplayPolicy)
      );
    }

    try {
      await audioContext.resume();
    } catch (error) {
      await audioContext.close().catch(() => undefined);
      throw new MediaElementSessionError(
        "autoplay_blocked",
        `AudioContext.resume() failed: ${error instanceof Error ? error.message : "Unknown resume error."}`,
        {
          audioContextState: audioContext.state,
          autoplayPolicy: audioContextAutoplayPolicy
        }
      );
    }

    if (audioContext.state !== "running") {
      const debugState = createDebugState(audioContext, audioContextAutoplayPolicy);
      await audioContext.close().catch(() => undefined);
      throw new MediaElementSessionError(
        "autoplay_blocked",
        `AudioContext remained ${debugState.audioContextState} after resume().`,
        debugState
      );
    }

    let sourceNode: MediaElementAudioSourceNode;

    try {
      sourceNode = audioContext.createMediaElementSource(mediaElement);
    } catch (error) {
      const technicalMessage =
        error instanceof Error ? error.message : "MediaElementAudioSourceNode could not be created.";
      const debugState = createDebugState(audioContext, audioContextAutoplayPolicy);
      await audioContext.close().catch(() => undefined);
      throw new MediaElementSessionError("source_conflict", technicalMessage, debugState);
    }

    const inputAnalyserNode = createAnalyser(audioContext);
    const outputAnalyserNode = createAnalyser(audioContext);
    const wetGainNode = audioContext.createGain();
    const bypassGainNode = audioContext.createGain();
    const asset = selectFaustAsset(undefined);

    await MediaElementSession.ensureWorkletModule(audioContext, asset.workletModulePath);
    const factory = await asset.loadFactory();
    const faustNode = new FaustMonoAudioWorkletNode(audioContext, {
      processorOptions: {
        name: asset.processorName,
        factory,
        sampleSize: getSampleSize(asset.meta)
      }
    });

    sourceNode.connect(inputAnalyserNode);
    inputAnalyserNode.connect(faustNode);
    faustNode.connect(outputAnalyserNode);
    outputAnalyserNode.connect(wetGainNode);
    wetGainNode.connect(audioContext.destination);
    sourceNode.connect(bypassGainNode);
    bypassGainNode.connect(audioContext.destination);

    const session = new MediaElementSession(
      mediaElement,
      gainPercent,
      advancedAudioSettings,
      audioContext,
      sourceNode,
      inputAnalyserNode,
      outputAnalyserNode,
      wetGainNode,
      bypassGainNode,
      faustNode,
      asset
    );

    session.applyRuntimeParameters();
    session.setProcessingEnabled(true);
    return session;
  }

  /**
   * Indica si esta sesión corresponde al media element indicado.
   */
  isConnectedTo(element: HTMLMediaElement): boolean {
    return this.mediaElement === element;
  }

  /**
   * Actualiza el nivel de boost actual reaplicando los parámetros DSP.
   */
  setGainPercent(gainPercent: number): void {
    this.currentGainPercent = gainPercent;
    this.latestMetrics = createDefaultMetrics(isProtectionBypassedSettings(this.currentSettings));
    this.applyRuntimeParameters();
  }

  /**
   * Reconfigura los ajustes avanzados del engine premium.
   */
  setAdvancedAudioSettings(settings: AdvancedAudioSettings): void {
    this.currentSettings = settings;
    this.latestMetrics = createDefaultMetrics(isProtectionBypassedSettings(settings));
    this.applyRuntimeParameters();
  }

  /**
   * Alterna entre procesamiento activo y bypass limpio del media element.
   */
  setProcessingEnabled(enabled: boolean): void {
    this.processingEnabled = enabled;
    this.wetGainNode.gain.value = enabled ? 1 : 0;
    this.bypassGainNode.gain.value = enabled ? 0 : 1;
  }

  /**
   * Mide el nivel actual y deriva métricas de protección/clipping para la UI.
   */
  sampleTelemetry(): MediaElementTelemetry {
    const runtime = applyQualityProtector(
      buildDspRuntimeParameters(this.currentGainPercent, this.currentSettings)
    );
    const inputPeak = readPeak(this.inputAnalyserNode);
    const outputPeak = this.processingEnabled ? readPeak(this.outputAnalyserNode) : inputPeak;
    const metrics = this.processingEnabled
      ? deriveMetricsFromPeaks(runtime, inputPeak, outputPeak, this.latestMetrics)
      : createDefaultMetrics(isProtectionBypassedSettings(this.currentSettings));
    const warning = this.processingEnabled ? deriveWarningFromMetrics(metrics) : "none";
    const level = roundTo(Math.min(1, Math.max(outputPeak, inputPeak * 0.45)), 4);

    this.latestMetrics = metrics;

    return {
      level,
      warning,
      metrics
    };
  }

  /**
   * Expone el estado actual del AudioContext para depuración.
   */
  getDebugState(): MediaElementSessionDebugState {
    return createDebugState(this.audioContext);
  }

  /**
   * Reintenta reanudar el `AudioContext` si quedó suspendido.
   */
  async resumeProcessing(): Promise<boolean> {
    await this.audioContext.resume().catch(() => undefined);
    return this.audioContext.state === "running";
  }

  /**
   * Desconecta por completo la sesión y cierra el `AudioContext`.
   */
  async stop(): Promise<void> {
    this.outputAnalyserNode.disconnect();
    this.wetGainNode.disconnect();
    this.bypassGainNode.disconnect();
    this.faustNode.disconnect();
    this.inputAnalyserNode.disconnect();
    this.sourceNode.disconnect();

    if (this.audioContext.state !== "closed") {
      await this.audioContext.close();
    }
  }

  /**
   * Aplica el mapping de parámetros de alto nivel al nodo Faust de la sesión.
   */
  private applyRuntimeParameters(): void {
    const runtime = applyQualityProtector(
      buildDspRuntimeParameters(this.currentGainPercent, this.currentSettings)
    );

    this.faustNode.setParamValue(this.asset.controlPaths.inputDriveDb, runtime.inputDriveDb);
    this.faustNode.setParamValue(this.asset.controlPaths.lookaheadMs, runtime.lookaheadMs);
    this.faustNode.setParamValue(this.asset.controlPaths.releaseMs, runtime.releaseMs);
    this.faustNode.setParamValue(this.asset.controlPaths.multibandDepth, runtime.multibandDepth);
    this.faustNode.setParamValue(this.asset.controlPaths.protectorEnabled, runtime.protectorEnabled ? 1 : 0);
    this.faustNode.setParamValue(
      this.asset.controlPaths.outputLimiterEnabled,
      runtime.outputLimiterEnabled ? 1 : 0
    );
    this.faustNode.setParamValue(this.asset.controlPaths.lowBandTrimDb, runtime.lowBandTrimDb);
    this.faustNode.setParamValue(this.asset.controlPaths.lowBandMakeupDb, runtime.lowBandMakeupDb);
    this.faustNode.setParamValue(
      this.asset.controlPaths.lowBandThresholdOffsetDb,
      runtime.lowBandThresholdOffsetDb
    );
    this.faustNode.setParamValue(this.asset.controlPaths.lowBandRatioBias, runtime.lowBandRatioBias);
    this.faustNode.setParamValue(
      this.asset.controlPaths.midHighThresholdOffsetDb,
      runtime.midHighThresholdOffsetDb
    );
    this.faustNode.setParamValue(this.asset.controlPaths.outputCeilingDb, runtime.outputCeilingDb);
    this.faustNode.setParamValue(this.asset.controlPaths.outputSoftClipMix, runtime.outputSoftClipMix);
    this.faustNode.setParamValue(
      this.asset.controlPaths.clarityPresenceTiltDb,
      runtime.clarityPresenceTiltDb
    );
    this.faustNode.setParamValue(this.asset.controlPaths.toneLowBandGainDb, runtime.toneLowBandGainDb);
    this.faustNode.setParamValue(this.asset.controlPaths.toneMidBandGainDb, runtime.toneMidBandGainDb);
  }

  private static async ensureWorkletModule(
    audioContext: BaseAudioContext,
    modulePath: string
  ): Promise<void> {
    const loadedModules = MediaElementSession.loadedWorkletModules.get(audioContext) ?? new Set<string>();

    if (loadedModules.has(modulePath)) {
      return;
    }

    const moduleUrl = getRuntimeUrlSafe(modulePath);

    if (!moduleUrl) {
      throw new MediaElementSessionError("attach_failed", "Extension context invalidated.");
    }

    await audioContext.audioWorklet.addModule(moduleUrl);
    loadedModules.add(modulePath);
    MediaElementSession.loadedWorkletModules.set(audioContext, loadedModules);
  }
}

/**
 * Crea un analyser calibrado para muestrear picos de entrada/salida.
 */
function createAnalyser(audioContext: AudioContext): AnalyserNode {
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.04;
  return analyser;
}

/**
 * Construye un estado de depuración a partir del `AudioContext` actual.
 */
function createDebugState(
  audioContext: BaseAudioContext,
  autoplayPolicy = getAudioContextAutoplayPolicy(audioContext)
): MediaElementSessionDebugState {
  return {
    audioContextState: audioContext.state,
    autoplayPolicy
  };
}

/**
 * Intenta leer la autoplay policy asociada al contexto cuando Chrome la
 * expone.
 */
function getAudioContextAutoplayPolicy(audioContext: BaseAudioContext): string | undefined {
  return getNavigatorAutoplayPolicy(audioContext, "audiocontext");
}

/**
 * Lee la autoplay policy asociada a un media element cuando Chrome la expone.
 */
function getMediaAutoplayPolicy(mediaElement: HTMLMediaElement): string | undefined {
  return getNavigatorAutoplayPolicy(mediaElement, "mediaelement");
}

/**
 * Devuelve `true` solo cuando el elemento está en un estado apto para intentar
 * conectar el grafo automático.
 */
export function shouldAttemptAutomaticMediaAttach(mediaElement: HTMLMediaElement): boolean {
  if (!hasAttachablePlayback(mediaElement)) {
    return false;
  }

  const mediaAutoplayPolicy = getMediaAutoplayPolicy(mediaElement);
  if (!hasRecentUserGesture()) {
    if (typeof mediaAutoplayPolicy !== "string") {
      return false;
    }

    return isAutoplayPolicyAllowed(mediaAutoplayPolicy);
  }

  return true;
}

/**
 * Indica si el media element ya está listo como candidato para enganchar el
 * grafo automático.
 */
export function hasPotentialMediaForAutomaticAttach(mediaElement: HTMLMediaElement): boolean {
  return hasAttachablePlayback(mediaElement);
}

/**
 * Determina si un media element ya está reproduciendo de forma suficiente como
 * para intentar adjuntarle el grafo automático.
 */
function hasAttachablePlayback(mediaElement: HTMLMediaElement): boolean {
  return (
    !mediaElement.ended &&
    !mediaElement.paused &&
    Boolean(mediaElement.currentSrc || mediaElement.srcObject) &&
    mediaElement.readyState >=
    (typeof HTMLMediaElement !== "undefined" ? HTMLMediaElement.HAVE_METADATA : 1)
  );
}

/**
 * Intenta leer la autoplay policy asociada al target cuando Chrome la expone.
 */
function getNavigatorAutoplayPolicy(
  target?: string | BaseAudioContext | HTMLMediaElement,
  fallbackTarget?: string
): string | undefined {
  const policyApi = (
    navigator as Navigator & {
      getAutoplayPolicy?: (target?: string | BaseAudioContext | HTMLMediaElement) => string;
    }
  ).getAutoplayPolicy;

  if (typeof policyApi !== "function") {
    return undefined;
  }

  try {
    return policyApi(target);
  } catch {
    if (!fallbackTarget) {
      return undefined;
    }
  }

  try {
  return policyApi(fallbackTarget);
  } catch {
    return undefined;
  }
}

/**
 * Retorna `true` cuando la policy permite iniciar Web Audio sin bloquearse por
 * autoplay.
 */
function isAutoplayPolicyAllowed(autoplayPolicy?: string): boolean {
  if (!autoplayPolicy) {
    return true;
  }

  const normalizedPolicy = autoplayPolicy.toLowerCase();

  return !["disallowed", "required", "muted"].some((forbiddenFragment) =>
    normalizedPolicy.includes(forbiddenFragment)
  );
}

/**
 * Determina el sample size Faust a partir de las opciones de compilación.
 */
function getSampleSize(meta: { compile_options: string }): 4 | 8 {
  return meta.compile_options.includes("-double") ? 8 : 4;
}

/**
 * Evalúa si hubo activación reciente del usuario en esta navegación.
 */
function hasRecentUserGesture(): boolean {
  const userActivation = (
    navigator as Navigator & { userActivation?: { isActive?: boolean; hasBeenActive?: boolean } }
  ).userActivation;

  if (!userActivation) {
    return true;
  }

  return Boolean(userActivation.isActive || userActivation.hasBeenActive);
}

/**
 * Devuelve el pico absoluto actual de un analyser.
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
 * Redondea un valor con la precisión solicitada.
 */
function roundTo(value: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}
