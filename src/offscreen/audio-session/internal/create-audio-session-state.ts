import {
  createDefaultMetrics,
  isProtectionBypassedSettings
} from "../../../shared/audio-settings";
import { createLoudnessEstimatorState } from "../../../shared/audio-settings/internal/create-loudness-estimator-state";
import type { AdvancedAudioSettings } from "../../../shared/types";
import { MONO_FAUST_ASSET } from "../../faust-assets";
import type { AudioSessionCallbacks } from "./audio-session-contract";
import type { AudioSessionState } from "./audio-session-state";

export function createAudioSessionState(
  gainPercent: number,
  advancedAudioSettings: AdvancedAudioSettings,
  callbacks: AudioSessionCallbacks
): AudioSessionState {
  return {
    audioContext: null,
    callbacks,
    currentAsset: MONO_FAUST_ASSET,
    currentGainPercent: gainPercent,
    currentSettings: advancedAudioSettings,
    engineStrategy: "faust",
    fatalErrorNotified: false,
    faustNode: null,
    faustRecoveryInFlight: false,
    faustRecoveryIntervalId: null,
    fallbackGraph: null,
    inputAnalyserNode: null,
    latestMetrics: createDefaultMetrics(isProtectionBypassedSettings(advancedAudioSettings)),
    meterIntervalId: null,
    normalizationLoudnessState: createLoudnessEstimatorState(48000),
    outputAnalyserNode: null,
    sourceNode: null,
    stream: null
  };
}
