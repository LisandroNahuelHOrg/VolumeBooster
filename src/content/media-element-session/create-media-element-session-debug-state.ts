import type { MediaElementSessionDebugState } from "./media-element-session-types";
import { getAudioContextAutoplayPolicy } from "./get-audio-context-autoplay-policy";

export function createMediaElementSessionDebugState(
  audioContext: BaseAudioContext,
  autoplayPolicy = getAudioContextAutoplayPolicy(audioContext)
): MediaElementSessionDebugState {
  return {
    audioContextState: audioContext.state,
    autoplayPolicy
  };
}
