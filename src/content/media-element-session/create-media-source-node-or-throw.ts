import { createMediaElementSessionDebugState } from "./create-media-element-session-debug-state";
import { MediaElementSessionError } from "./media-element-session-error";

export async function createMediaSourceNodeOrThrow(
  audioContext: AudioContext,
  mediaElement: HTMLMediaElement,
  autoplayPolicy?: string
): Promise<MediaElementAudioSourceNode> {
  try {
    return audioContext.createMediaElementSource(mediaElement);
  } catch (error) {
    const technicalMessage =
      error instanceof Error ? error.message : "MediaElementAudioSourceNode could not be created.";
    const debugState = createMediaElementSessionDebugState(audioContext, autoplayPolicy);
    await audioContext.close().catch(() => undefined);
    throw new MediaElementSessionError("source_conflict", technicalMessage, debugState);
  }
}
