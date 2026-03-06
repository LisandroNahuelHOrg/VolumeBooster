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

export interface MediaElementTelemetry {
  level: number;
  warning: LevelWarning;
  metrics: DspRuntimeMetrics;
}

export interface MediaElementSessionDebugState {
  audioContextState: AudioContextState | "none";
  autoplayPolicy?: string;
}

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

  static async create(
    mediaElement: HTMLMediaElement,
    gainPercent: number,
    advancedAudioSettings: AdvancedAudioSettings
  ): Promise<MediaElementSession> {
    const initialAutoplayPolicy = getAudioContextAutoplayPolicyHint();
    const hasUserActivation = hasPageUserActivation();

    if (!hasUserActivation || (initialAutoplayPolicy && initialAutoplayPolicy !== "allowed")) {
      const technicalMessage =
        initialAutoplayPolicy && initialAutoplayPolicy !== "allowed"
          ? `AudioContext creation is blocked until the page receives a user gesture (${initialAutoplayPolicy}).`
          : "AudioContext creation is blocked until the page receives a user gesture.";

      throw new MediaElementSessionError(
        "autoplay_blocked",
        technicalMessage,
        {
          audioContextState: "none",
          autoplayPolicy: initialAutoplayPolicy
        }
      );
    }

    const audioContext = new AudioContext();
    const autoplayPolicy = getAutoplayPolicy(audioContext);
    await audioContext.resume().catch(() => undefined);

    if (audioContext.state !== "running") {
      const debugState = createDebugState(audioContext, autoplayPolicy);
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
      const debugState = createDebugState(audioContext, autoplayPolicy);
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

  isConnectedTo(element: HTMLMediaElement): boolean {
    return this.mediaElement === element;
  }

  setGainPercent(gainPercent: number): void {
    this.currentGainPercent = gainPercent;
    this.latestMetrics = createDefaultMetrics(isProtectionBypassedSettings(this.currentSettings));
    this.applyRuntimeParameters();
  }

  setAdvancedAudioSettings(settings: AdvancedAudioSettings): void {
    this.currentSettings = settings;
    this.latestMetrics = createDefaultMetrics(isProtectionBypassedSettings(settings));
    this.applyRuntimeParameters();
  }

  setProcessingEnabled(enabled: boolean): void {
    this.processingEnabled = enabled;
    this.wetGainNode.gain.value = enabled ? 1 : 0;
    this.bypassGainNode.gain.value = enabled ? 0 : 1;
  }

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

  getDebugState(): MediaElementSessionDebugState {
    return createDebugState(this.audioContext);
  }

  async resumeProcessing(): Promise<boolean> {
    await this.audioContext.resume().catch(() => undefined);
    return this.audioContext.state === "running";
  }

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

    await audioContext.audioWorklet.addModule(chrome.runtime.getURL(modulePath));
    loadedModules.add(modulePath);
    MediaElementSession.loadedWorkletModules.set(audioContext, loadedModules);
  }
}

function createAnalyser(audioContext: AudioContext): AnalyserNode {
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.04;
  return analyser;
}

function createDebugState(
  audioContext: BaseAudioContext,
  autoplayPolicy = getAutoplayPolicy(audioContext)
): MediaElementSessionDebugState {
  return {
    audioContextState: audioContext.state,
    autoplayPolicy
  };
}

function getAutoplayPolicy(audioContext: BaseAudioContext): string | undefined {
  const policyApi = (
    navigator as Navigator & {
      getAutoplayPolicy?: (target?: string | BaseAudioContext | HTMLMediaElement) => string;
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

function getAudioContextAutoplayPolicyHint(): string | undefined {
  const policyApi = (
    navigator as Navigator & {
      getAutoplayPolicy?: (target?: string | BaseAudioContext | HTMLMediaElement) => string;
    }
  ).getAutoplayPolicy;

  if (typeof policyApi !== "function") {
    return undefined;
  }

  try {
    return policyApi("audiocontext");
  } catch {
    return undefined;
  }
}

function hasPageUserActivation(): boolean {
  const activationState = (
    navigator as Navigator & {
      userActivation?: {
        hasBeenActive?: boolean;
        isActive?: boolean;
      };
    }
  ).userActivation;

  return Boolean(activationState?.hasBeenActive || activationState?.isActive);
}

function getSampleSize(meta: { compile_options: string }): 4 | 8 {
  return meta.compile_options.includes("-double") ? 8 : 4;
}

function readPeak(analyserNode: AnalyserNode): number {
  const buffer = new Float32Array(analyserNode.fftSize);
  analyserNode.getFloatTimeDomainData(buffer);

  let peak = 0;

  for (const value of buffer) {
    peak = Math.max(peak, Math.abs(value));
  }

  return roundTo(peak, 4);
}

function roundTo(value: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}
