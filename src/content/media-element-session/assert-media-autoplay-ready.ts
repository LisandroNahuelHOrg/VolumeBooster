import { MediaElementSessionError } from "./media-element-session-error";
import { getMediaAutoplayPolicy } from "./get-media-autoplay-policy";
import { hasRecentUserGesture } from "./has-recent-user-gesture";
import { isAutoplayPolicyAllowed } from "./is-autoplay-policy-allowed";

export function assertMediaAutoplayReady(mediaElement: HTMLMediaElement): string | undefined {
  const mediaAutoplayPolicy = getMediaAutoplayPolicy(mediaElement);
  const mediaAutoplayPolicyKnown = typeof mediaAutoplayPolicy === "string";
  const autoplayPolicyAllowsCreateWithoutGesture =
    mediaAutoplayPolicyKnown && isAutoplayPolicyAllowed(mediaAutoplayPolicy);

  if (!hasRecentUserGesture() && !autoplayPolicyAllowsCreateWithoutGesture) {
    throw new MediaElementSessionError(
      "autoplay_blocked",
      `AudioContext autoplay policy requires user gesture (${mediaAutoplayPolicy ?? "unknown"}).`,
      {
        audioContextState: "none",
        autoplayPolicy: mediaAutoplayPolicy
      }
    );
  }

  return mediaAutoplayPolicy;
}
