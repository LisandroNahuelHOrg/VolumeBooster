import type { AudioSessionState } from "../audio-session-state";
import { createNativeFallbackGraph } from "./create-native-fallback-graph";
import { scheduleFaustRecovery } from "./schedule-faust-recovery";

export function activateNativeFallbackGraph(
  state: AudioSessionState,
  audioContext: AudioContext,
  inputAnalyserNode: AnalyserNode,
  outputAnalyserNode: AnalyserNode
): void {
  state.faustNode = null;
  state.fallbackGraph = createNativeFallbackGraph(audioContext, inputAnalyserNode, outputAnalyserNode);
  scheduleFaustRecovery(state);
}
