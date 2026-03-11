import type { AutoAttachReason } from "../../shared/types";
import type { MediaElementSessionDebugState } from "./media-element-session-types";

export class MediaElementSessionError extends Error {
  constructor(
    readonly reason: AutoAttachReason,
    readonly technicalMessage?: string,
    readonly debugState?: MediaElementSessionDebugState
  ) {
    super(technicalMessage ?? reason);
    this.name = "MediaElementSessionError";
  }
}
