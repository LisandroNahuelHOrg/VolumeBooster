import {
  createDefaultMetrics,
  isProtectionBypassedSettings
} from "../../../../shared/audio-settings";
import { emitAudioSessionTelemetry } from "../telemetry/emit-audio-session-telemetry";
import type { AudioSessionState } from "../audio-session-state";
import type { LocalizedMessage } from "../../../../shared/types";

export function handleAudioSessionFatalError(
  state: AudioSessionState,
  errorMessage: LocalizedMessage
): void {
  if (state.fatalErrorNotified) {
    return;
  }

  state.fatalErrorNotified = true;
  state.latestMetrics = createDefaultMetrics(isProtectionBypassedSettings(state.currentSettings));
  emitAudioSessionTelemetry(state, 0, "danger", state.latestMetrics);
  state.callbacks.onFatalError?.(errorMessage);
}
