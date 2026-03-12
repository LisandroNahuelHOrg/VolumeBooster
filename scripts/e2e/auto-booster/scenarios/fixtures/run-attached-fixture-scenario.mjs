import { startBasicPlayback } from "../../playback/start-basic-playback.mjs";
import { evaluateScenarioResult } from "../../results/evaluate-scenario-result.mjs";
import { waitForAttachOrGestureWithRecovery } from "../../waiters/wait-for-attach-or-gesture-with-recovery.mjs";

export async function runAttachedFixtureScenario(input) {
  if (input.scenario.waitForSelector) {
    await input.page.waitForSelector(input.scenario.waitForSelector);
  }

  const outcome = await waitForAttachOrGestureWithRecovery({
    automationPage: input.automationPage,
    page: input.page,
    startPlayback: startBasicPlayback,
    tabId: input.tabId
  });

  return evaluateScenarioResult("attached", outcome.finalDebug);
}
