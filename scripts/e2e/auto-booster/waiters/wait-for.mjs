import { wait } from "./wait.mjs";

export async function waitFor(fn, timeoutMs) {
  const start = Date.now();
  let lastError;

  while (Date.now() - start < timeoutMs) {
    try {
      const value = await fn();

      if (value) {
        return value;
      }
    } catch (error) {
      lastError = error;
    }

    await wait(150);
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error(`Timed out after ${timeoutMs}ms.`);
}
