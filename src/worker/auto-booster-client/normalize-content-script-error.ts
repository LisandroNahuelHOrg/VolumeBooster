import { message } from "../../shared/messages";
import type { LocalizedMessage } from "../../shared/types";

export function normalizeContentScriptError(error: unknown): LocalizedMessage {
  if (
    error instanceof Error &&
    /Cannot access contents of the page|The extensions gallery cannot be scripted/i.test(error.message)
  ) {
    return message("errorAutoPermissionMissing");
  }

  return message("errorAutoAttachFailed");
}
