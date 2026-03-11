import type { AutoBoosterScope, LocalizedMessage } from "../../../shared/types";

export function shouldKeepAutoFrameInObservingMode(
  scope: AutoBoosterScope | null | undefined,
  error?: LocalizedMessage
): boolean {
  if (scope !== "global") {
    return false;
  }

  return !error || error.key !== "errorAutoPermissionMissing";
}
