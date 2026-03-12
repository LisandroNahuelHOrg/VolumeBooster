import { message, sendMessage, type OffscreenCommand } from "../../shared/messages";
import type { RuntimeResponse } from "../../shared/types";
import { delay } from "./delay";
import { ensureOffscreenDocument } from "./ensure-offscreen-document";
import { isMissingReceiverError } from "./is-missing-receiver-error";

export async function sendOffscreenMessage<T>(
  command: OffscreenCommand,
  attempts = 2
): Promise<RuntimeResponse<T>> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await sendMessage<T>(command);
    } catch (error) {
      lastError = error;

      if (!isMissingReceiverError(error) || attempt === attempts - 1) {
        throw error;
      }

      await ensureOffscreenDocument();
      await delay(50);
    }
  }

  throw lastError ?? message("errorOffscreenMessageUndeliverable");
}
