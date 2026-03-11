import type { MediaElementSessionState } from "./media-element-session-state";

export async function stopMediaElementSession(state: MediaElementSessionState): Promise<void> {
  state.outputAnalyserNode.disconnect();
  state.wetGainNode.disconnect();
  state.bypassGainNode.disconnect();
  state.faustNode.disconnect();
  state.inputAnalyserNode.disconnect();
  state.sourceNode.disconnect();

  if (state.audioContext.state !== "closed") {
    await state.audioContext.close();
  }
}
