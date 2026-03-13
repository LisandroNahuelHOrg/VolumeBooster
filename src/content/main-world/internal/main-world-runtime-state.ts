import type {
  AdvancedAudioSettings,
  AutoAttachReason,
  AutoAttachState,
  AutoBoosterConfigPayload,
  DspRuntimeMetrics,
  LevelWarning
} from "../../../shared/types";
import type { LoudnessEstimatorState } from "../../../shared/audio-settings/internal/loudness-estimator-state";
import type { BridgeStatusPayload } from "../../bridge-protocol";

declare global {
  interface Window {
    __PRISM_AUTO_BOOSTER_MAIN_WORLD_BOOTED__?: boolean;
    __PRISM_AUTO_BOOSTER_MAIN_IMPORT_PROMISE__?: Promise<unknown>;
    __PRISM_AUTO_BOOSTER_MAIN_WORLD_TESTABLES__?: MainWorldTestables;
    webkitAudioContext?: typeof AudioContext;
  }
}

export type AudioContextConstructor = typeof AudioContext;

export interface BridgeContextState {
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
  normalizationLoudnessState: LoudnessEstimatorState;
  internalNodes: WeakSet<AudioNode>;
  attachedNodes: Set<AudioNode>;
  lastMetrics: DspRuntimeMetrics;
}

export interface BridgeControllerState {
  enabled: boolean;
  suspended: boolean;
  scope: AutoBoosterConfigPayload["scope"] | null;
  gainPercent: number;
  advancedAudioSettings: AdvancedAudioSettings | null;
}

export interface MainWorldController {
  bridgeStates: WeakMap<AudioContext, BridgeContextState>;
  bridgeStateList: BridgeContextState[];
  nodeBridgeMembership: WeakMap<AudioNode, Set<number>>;
  contextIds: WeakMap<AudioContext, number>;
  PatchedAudioContext: AudioContextConstructor;
  PatchedWebkitAudioContext?: AudioContextConstructor;
  originalConnect: AudioNode["connect"];
  originalDisconnect: AudioNode["disconnect"];
  telemetryTimer: number | null;
  nextContextId: number;
  lastTechnicalError?: string;
  state: BridgeControllerState;
  handleBridgeCommand: (event: Event) => void;
  handlePatchedConnect: AudioNode["connect"];
  handlePatchedDisconnect: AudioNode["disconnect"];
  bootstrap: () => void;
  configure: (payload: AutoBoosterConfigPayload) => void;
  disable: () => void;
  patchConstructors: () => void;
  patchAudioNodePrototype: () => void;
  registerContext: (context: AudioContext) => void;
  resolveBridgeStateForNode: (node: AudioNode) => BridgeContextState | null;
  attachExternalNode: (bridgeState: BridgeContextState, node: AudioNode) => void;
  detachExternalNode: (bridgeState: BridgeContextState, node: AudioNode) => void;
  applyRuntimeParameters: (bridgeState: BridgeContextState) => void;
  applyBypassState: (bridgeState: BridgeContextState) => void;
  syncTelemetryLoop: () => void;
  publishTelemetry: () => void;
  buildStatusPayload: () => BridgeStatusPayload;
  reportStatus: () => void;
}

export interface MainWorldTestables {
  createMainWorldController: () => MainWorldController;
  createBridgeState: (context: AudioContext, id: number) => BridgeContextState;
  createAnalyser: (context: AudioContext) => AnalyserNode;
  createSoftClipCurve: (intensity: number) => Float32Array;
  readPeak: (analyser: AnalyserNode) => number;
  getAutoplayPolicy: (audioContext: AudioContext) => string | undefined;
  dbToGain: (decibels: number) => number;
  clampNumber: (value: number, min: number, max: number) => number;
  roundTo: (value: number, precision: number) => number;
  pickHighestWarning: (current: LevelWarning, next: LevelWarning) => LevelWarning;
}

export const LOW_SHELF_FREQUENCY_HZ = 180;
export const MID_PEAK_FREQUENCY_HZ = 1700;
export const MID_PEAK_Q = 0.82;
export const PROTECTION_DEPTH_ATTACK_FLOOR_SEC = 0.003;
export const MAX_OUTPUT_GAIN_DB = 0;
