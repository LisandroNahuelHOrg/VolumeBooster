import { MediaElementSessionError } from "./media-element-session-error";

export function createAudioContextOrThrow(mediaAutoplayPolicy?: string): AudioContext {
  try {
    return new AudioContext();
  } catch (error) {
    throw new MediaElementSessionError(
      "autoplay_blocked",
      `AudioContext was not allowed to start. ${error instanceof Error ? error.message : "Unknown startup error."}`,
      {
        audioContextState: "none",
        autoplayPolicy: mediaAutoplayPolicy
      }
    );
  }
}
