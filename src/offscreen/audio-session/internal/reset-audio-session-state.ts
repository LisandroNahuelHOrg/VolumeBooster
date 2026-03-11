import { createDefaultMetrics } from "../../../shared/audio-settings";
import type { AudioSessionState } from "./audio-session-state";

export function resetAudioSessionState(state: AudioSessionState): void {
  state.stream = null;
  state.audioContext = null;
  state.sourceNode = null;
  state.inputAnalyserNode = null;
  state.outputAnalyserNode = null;
  state.faustNode = null;
  state.fallbackGraph = null;
  state.latestMetrics = createDefaultMetrics();
  state.fatalErrorNotified = false;
  state.faustRecoveryInFlight = false;
  state.engineStrategy = "faust";
}
