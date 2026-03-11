import type { FaustMonoAudioWorkletNode } from "@grame/faustwasm";
import type {
  AdvancedAudioSettings,
  DspRuntimeMetrics
} from "../../shared/types";
import type { FaustAssetDescriptor } from "../../offscreen/faust-assets";

export interface MediaElementSessionGraph {
  audioContext: AudioContext;
  sourceNode: MediaElementAudioSourceNode;
  inputAnalyserNode: AnalyserNode;
  outputAnalyserNode: AnalyserNode;
  wetGainNode: GainNode;
  bypassGainNode: GainNode;
  faustNode: FaustMonoAudioWorkletNode;
  asset: FaustAssetDescriptor;
}

export interface MediaElementSessionState extends MediaElementSessionGraph {
  mediaElement: HTMLMediaElement;
  currentGainPercent: number;
  currentSettings: AdvancedAudioSettings;
  latestMetrics: DspRuntimeMetrics;
  processingEnabled: boolean;
}
