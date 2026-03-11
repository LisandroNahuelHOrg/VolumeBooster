import {
  createDefaultMetrics,
  isProtectionBypassedSettings
} from "../../../../shared/audio-settings";
import { applyAudioSessionRuntimeParameters } from "../graph/apply-audio-session-runtime-parameters";
import { emitCurrentAudioSessionTelemetry } from "../telemetry/emit-current-audio-session-telemetry";
import type { AudioSessionState } from "../audio-session-state";

export function setAudioSessionSettings(
  state: AudioSessionState,
  settings: AudioSessionState["currentSettings"]
): void {
  state.currentSettings = settings;
  state.latestMetrics = createDefaultMetrics(isProtectionBypassedSettings(settings));
  applyAudioSessionRuntimeParameters(state);
  emitCurrentAudioSessionTelemetry(state);
}
