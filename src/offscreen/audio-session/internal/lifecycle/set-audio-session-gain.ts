import {
  createDefaultMetrics,
  isProtectionBypassedSettings
} from "../../../../shared/audio-settings";
import { applyAudioSessionRuntimeParameters } from "../graph/apply-audio-session-runtime-parameters";
import { emitCurrentAudioSessionTelemetry } from "../telemetry/emit-current-audio-session-telemetry";
import type { AudioSessionState } from "../audio-session-state";

export function setAudioSessionGain(
  state: AudioSessionState,
  gainPercent: number
): void {
  state.currentGainPercent = gainPercent;
  state.latestMetrics = createDefaultMetrics(isProtectionBypassedSettings(state.currentSettings));
  applyAudioSessionRuntimeParameters(state);
  emitCurrentAudioSessionTelemetry(state);
}
