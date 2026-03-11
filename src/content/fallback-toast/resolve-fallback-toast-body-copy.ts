import type {
  AutoFallbackToastCommandPayload,
  LocalizedMessage
} from "../../shared/types";
import { getI18nMessageSafe } from "../runtime-api";
import { localizeFallbackToastMessage } from "./localize-fallback-toast-message";

export function resolveFallbackToastBodyCopy(
  reason: AutoFallbackToastCommandPayload["reason"],
  errorMessage?: LocalizedMessage
): string {
  if (errorMessage) {
    return localizeFallbackToastMessage(errorMessage);
  }

  if (reason === "permission_missing") {
    return getI18nMessageSafe("autoBoosterFallbackToastPermissionBody");
  }

  return getI18nMessageSafe("autoBoosterFallbackToastBody");
}
