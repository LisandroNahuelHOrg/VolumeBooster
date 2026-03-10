import { shouldAttemptAutomaticMediaAttach } from "../media-element-session";

export function isMediaElementReadyForAttach(mediaElement: HTMLMediaElement): boolean {
  return shouldAttemptAutomaticMediaAttach(mediaElement);
}
