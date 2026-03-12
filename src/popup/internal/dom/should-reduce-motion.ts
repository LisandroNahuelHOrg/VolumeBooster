import { REDUCED_MOTION_MEDIA_QUERY } from "../../../shared/constants";

export function shouldReduceMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION_MEDIA_QUERY).matches;
}
