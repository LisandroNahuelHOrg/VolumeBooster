import { hasManualSession } from "../results/has-manual-session.mjs";
import { getState } from "../runtime/get-state.mjs";
import { wait } from "./wait.mjs";

export async function waitForManualSession(automationPage, tabId, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const state = await getState(automationPage);

    if (hasManualSession(state, tabId)) {
      return state;
    }

    await wait(150);
  }

  throw new Error(`Timed out after ${timeoutMs}ms.`);
}
