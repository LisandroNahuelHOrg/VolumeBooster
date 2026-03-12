import { hasManualSession } from "../../results/has-manual-session.mjs";
import { waitForManualSession } from "../../waiters/wait-for-manual-session.mjs";

export async function runManualFixtureScenario(input) {
  await input.page.click("#start-playback");
  const finalState = await waitForManualSession(input.automationPage, input.tabId, 12000);

  return {
    classification: "pass_manual",
    finalDebug: null,
    passed: hasManualSession(finalState, input.tabId)
  };
}
