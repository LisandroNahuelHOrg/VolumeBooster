import { hasAttachablePlayback } from "./has-attachable-playback";

export function hasPotentialMediaForAutomaticAttach(mediaElement: HTMLMediaElement): boolean {
  return hasAttachablePlayback(mediaElement);
}
