import { createMediaElementSession } from "./media-element-session/create-media-element-session";

export type { MediaElementSession } from "./media-element-session/media-element-session-contract";
export type {
  MediaElementSessionDebugState,
  MediaElementTelemetry
} from "./media-element-session/media-element-session-types";
export { MediaElementSessionError } from "./media-element-session/media-element-session-error";
export { hasPotentialMediaForAutomaticAttach } from "./media-element-session/has-potential-media-for-automatic-attach";
export { shouldAttemptAutomaticMediaAttach } from "./media-element-session/should-attempt-automatic-media-attach";

export const MediaElementSession = {
  create: createMediaElementSession
};
