import { getState } from "../runtime/get-state.mjs";
import { wait } from "./wait.mjs";

export async function waitForWorkerState(automationPage, predicate, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const state = await getState(automationPage);

    if (predicate(state)) {
      return state;
    }

    await wait(150);
  }

  throw new Error(`Timed out after ${timeoutMs}ms.`);
}
