export const postRuntimeMessage = (message: unknown): void => {
  try {
    const maybePromise = chrome.runtime.sendMessage(message) as Promise<unknown> | undefined;

    if (maybePromise && typeof maybePromise.catch === "function") {
      void maybePromise.catch(() => undefined);
    }
  } catch {
    // The service worker may be temporarily unavailable; the next state sync will recover.
  }
};
