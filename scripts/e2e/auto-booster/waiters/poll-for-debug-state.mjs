import { getDebugState } from "../runtime/get-debug-state.mjs";
import { wait } from "./wait.mjs";

export async function pollForDebugState(automationPage, tabId, timeoutMs) {
  const start = Date.now();
  let lastDebug = await getDebugState(automationPage, tabId);

  while (Date.now() - start < timeoutMs) {
    await wait(250);
    lastDebug = await getDebugState(automationPage, tabId);

    if (lastDebug?.attachState === "attached" || lastDebug?.attachState === "awaiting_user_gesture") {
      return lastDebug;
    }
  }

  return lastDebug;
}
