import { evaluateScenarioResult } from "../../results/evaluate-scenario-result.mjs";
import { waitForAttachedDebugState } from "../../waiters/wait-for-attached-debug-state.mjs";
import { waitForAwaitingUserGestureDebugState } from "../../waiters/wait-for-awaiting-user-gesture-debug-state.mjs";

export async function runAwaitingGestureFixtureScenario(input) {
  const waitingDebug = await waitForAwaitingUserGestureDebugState(input.automationPage, input.tabId, 12000);

  await input.page.click("#unlock-playback");
  const finalDebug = await waitForAttachedDebugState(input.automationPage, input.tabId, 12000);

  return evaluateScenarioResult("awaiting_then_attached", finalDebug, waitingDebug);
}
