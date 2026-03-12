import { getDebugState } from "../runtime/get-debug-state.mjs";
import { wait } from "./wait.mjs";

export async function waitForObservingNoMediaDebugState(automationPage, tabId, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const debug = await getDebugState(automationPage, tabId);

    if (debug?.attachState === "observing" && debug?.attachReason === "no_media") {
      return debug;
    }

    await wait(150);
  }

  throw new Error(`Timed out after ${timeoutMs}ms.`);
}
