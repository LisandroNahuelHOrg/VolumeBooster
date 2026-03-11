import { disconnectNativeFallbackGraph } from "../graph/disconnect-native-fallback-graph";
import { cancelFaustRecovery } from "../graph/cancel-faust-recovery";
import { resetAudioSessionState } from "../reset-audio-session-state";
import type { AudioSessionState } from "../audio-session-state";

export async function stopAudioSession(state: AudioSessionState): Promise<void> {
  if (state.meterIntervalId !== null) {
    window.clearInterval(state.meterIntervalId);
    state.meterIntervalId = null;
  }

  cancelFaustRecovery(state);
  state.outputAnalyserNode?.disconnect();
  disconnectNativeFallbackGraph(state.fallbackGraph);
  state.faustNode?.disconnect();
  state.inputAnalyserNode?.disconnect();
  state.sourceNode?.disconnect();
  state.stream?.getTracks().forEach((track) => track.stop());

  if (state.audioContext && state.audioContext.state !== "closed") {
    await state.audioContext.close();
  }

  resetAudioSessionState(state);
}
