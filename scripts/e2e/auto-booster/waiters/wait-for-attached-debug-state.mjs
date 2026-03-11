import { getDebugState } from "../runtime/get-debug-state.mjs";
import { wait } from "./wait.mjs";

export async function waitForAttachedDebugState(automationPage, tabId, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const debug = await getDebugState(automationPage, tabId);

    if (debug?.attachState === "attached") {
      return debug;
    }

    await wait(150);
  }

  throw new Error(`Timed out after ${timeoutMs}ms.`);
}
