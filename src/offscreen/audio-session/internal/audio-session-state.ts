import type { FaustMonoAudioWorkletNode } from "@grame/faustwasm";
import type { AdvancedAudioSettings, DspRuntimeMetrics } from "../../../shared/types";
import type { FaustAssetDescriptor } from "../../faust-assets";
import type { AudioSessionCallbacks } from "./audio-session-contract";

export type AudioEngineStrategy = "faust" | "native_fallback";

export interface NativeFallbackGraph {
  preGain: GainNode;
  lowShelf: BiquadFilterNode;
  midPeak: BiquadFilterNode;
  compressor: DynamicsCompressorNode;
  shaper: WaveShaperNode;
  wetGain: GainNode;
  dryGain: GainNode;
}

export interface AudioSessionState {
  callbacks: AudioSessionCallbacks;
  currentAsset: FaustAssetDescriptor;
  currentGainPercent: number;
  currentSettings: AdvancedAudioSettings;
  engineStrategy: AudioEngineStrategy;
  fatalErrorNotified: boolean;
  faustNode: FaustMonoAudioWorkletNode | null;
  faustRecoveryInFlight: boolean;
  faustRecoveryIntervalId: number | null;
  fallbackGraph: NativeFallbackGraph | null;
  inputAnalyserNode: AnalyserNode | null;
  latestMetrics: DspRuntimeMetrics;
  meterIntervalId: number | null;
  outputAnalyserNode: AnalyserNode | null;
  sourceNode: MediaStreamAudioSourceNode | null;
  stream: MediaStream | null;
  audioContext: AudioContext | null;
}
