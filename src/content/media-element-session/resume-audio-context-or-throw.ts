import { createMediaElementSessionDebugState } from "./create-media-element-session-debug-state";
import { getAudioContextAutoplayPolicy } from "./get-audio-context-autoplay-policy";
import { isAutoplayPolicyAllowed } from "./is-autoplay-policy-allowed";
import { MediaElementSessionError } from "./media-element-session-error";

export async function resumeAudioContextOrThrow(audioContext: AudioContext): Promise<string | undefined> {
  const audioContextAutoplayPolicy = getAudioContextAutoplayPolicy(audioContext);

  if (!isAutoplayPolicyAllowed(audioContextAutoplayPolicy)) {
    await audioContext.close().catch(() => undefined);
    throw new MediaElementSessionError(
      "autoplay_blocked",
      `AudioContext autoplay policy is disallowed (${audioContextAutoplayPolicy}).`,
      createMediaElementSessionDebugState(audioContext, audioContextAutoplayPolicy)
    );
  }

  try {
    await audioContext.resume();
  } catch (error) {
    await audioContext.close().catch(() => undefined);
    throw new MediaElementSessionError(
      "autoplay_blocked",
      `AudioContext.resume() failed: ${error instanceof Error ? error.message : "Unknown resume error."}`,
      {
        audioContextState: audioContext.state,
        autoplayPolicy: audioContextAutoplayPolicy
      }
    );
  }

  if (audioContext.state !== "running") {
    const debugState = createMediaElementSessionDebugState(audioContext, audioContextAutoplayPolicy);
    await audioContext.close().catch(() => undefined);
    throw new MediaElementSessionError(
      "autoplay_blocked",
      `AudioContext remained ${debugState.audioContextState} after resume().`,
      debugState
    );
  }

  return audioContextAutoplayPolicy;
}
