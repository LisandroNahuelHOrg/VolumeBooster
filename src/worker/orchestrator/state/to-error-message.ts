import { isLocalizedMessage, message } from "../../../shared/messages";
import type { LocalizedMessage } from "../../../shared/types";

export function toErrorMessage(error: unknown): LocalizedMessage {
  if (isLocalizedMessage(error)) {
    return error;
  }

  return message("errorExtensionActionFailed");
}
