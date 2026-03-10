import { hasPotentialMediaForAutomaticAttach } from "../media-element-session";

export function isMediaElementPotentiallyAttachable(mediaElement: HTMLMediaElement): boolean {
  return hasPotentialMediaForAutomaticAttach(mediaElement);
}
