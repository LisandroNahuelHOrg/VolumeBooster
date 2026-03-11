import { evaluateScenarioResult } from "../../results/evaluate-scenario-result.mjs";
import { waitForObservingNoMediaDebugState } from "../../waiters/wait-for-observing-no-media-debug-state.mjs";

export async function runNoMediaFixtureScenario(input) {
  const finalDebug = await waitForObservingNoMediaDebugState(input.automationPage, input.tabId, 12000);

  return evaluateScenarioResult("observing_no_media", finalDebug);
}
