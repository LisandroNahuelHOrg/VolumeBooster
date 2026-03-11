import type { RuntimeResponse } from "../types";
import type { ExtensionMessage } from "./extension-message";
import { createLocalizedMessage } from "./create-localized-message";
import { failRuntimeResponse } from "./fail-runtime-response";
import { normalizeRuntimeResponse } from "./normalize-runtime-response";
import { sendExtensionMessage } from "./send-extension-message";

export async function sendExtensionMessageSafe<T>(messageValue: ExtensionMessage): Promise<RuntimeResponse<T>> {
  try {
    const response = await sendExtensionMessage<T>(messageValue);
    return normalizeRuntimeResponse(response);
  } catch {
    return failRuntimeResponse(createLocalizedMessage("errorRuntimeMessageUndeliverable"));
  }
}
