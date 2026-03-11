import { delay } from "./delay.mjs";
import { isRetriableFaustFsError } from "./isRetriableFaustFsError.mjs";

export async function withFaustFsRetries(operation, attempts = 5, delayMs = 150) {
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isRetriableFaustFsError(error) || attempt === attempts - 1) {
        throw error;
      }

      await delay(delayMs * (attempt + 1));
    }
  }

  throw lastError;
}
