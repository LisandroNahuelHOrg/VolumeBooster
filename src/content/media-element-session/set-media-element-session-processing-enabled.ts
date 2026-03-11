import type { MediaElementSessionState } from "./media-element-session-state";

export function setMediaElementSessionProcessingEnabled(
  state: MediaElementSessionState,
  enabled: boolean
): void {
  state.processingEnabled = enabled;
  state.wetGainNode.gain.value = enabled ? 1 : 0;
  state.bypassGainNode.gain.value = enabled ? 0 : 1;
}
