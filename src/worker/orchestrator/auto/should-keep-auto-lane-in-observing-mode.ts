import type { AutoBoosterScope, LocalizedMessage } from "../../../shared/types";

export function shouldKeepAutoLaneInObservingMode(
  scope: AutoBoosterScope,
  error: LocalizedMessage
): boolean {
  return scope === "global" && error.key !== "errorAutoPermissionMissing";
}
