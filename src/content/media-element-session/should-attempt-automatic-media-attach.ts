import { getMediaAutoplayPolicy } from "./get-media-autoplay-policy";
import { hasAttachablePlayback } from "./has-attachable-playback";
import { hasRecentUserGesture } from "./has-recent-user-gesture";
import { isAutoplayPolicyAllowed } from "./is-autoplay-policy-allowed";

export function shouldAttemptAutomaticMediaAttach(mediaElement: HTMLMediaElement): boolean {
  if (!hasAttachablePlayback(mediaElement)) {
    return false;
  }

  const mediaAutoplayPolicy = getMediaAutoplayPolicy(mediaElement);

  if (!hasRecentUserGesture()) {
    if (typeof mediaAutoplayPolicy !== "string") {
      return false;
    }

    return isAutoplayPolicyAllowed(mediaAutoplayPolicy);
  }

  return true;
}
