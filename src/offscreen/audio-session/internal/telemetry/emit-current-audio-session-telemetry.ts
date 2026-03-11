import { publishAudioSessionTelemetry } from "./publish-audio-session-telemetry";
import type { AudioSessionState } from "../audio-session-state";

export function emitCurrentAudioSessionTelemetry(
  state: AudioSessionState
): void {
  if (!state.inputAnalyserNode || !state.outputAnalyserNode) {
    return;
  }

  publishAudioSessionTelemetry(state, state.inputAnalyserNode, state.outputAnalyserNode);
}
