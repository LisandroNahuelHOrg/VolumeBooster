import { getNavigatorAutoplayPolicy } from "./get-navigator-autoplay-policy";

export function getMediaAutoplayPolicy(mediaElement: HTMLMediaElement): string | undefined {
  return getNavigatorAutoplayPolicy(mediaElement, "mediaelement");
}
