import { startBasicPlayback } from "../../playback/start-basic-playback.mjs";
import { getActiveTab } from "../../runtime/get-active-tab.mjs";
import { captureScenarioScreenshot } from "../../results/capture-scenario-screenshot.mjs";
import { evaluateScenarioResult } from "../../results/evaluate-scenario-result.mjs";
import { closeResourceQuietly } from "../../shared/close-resource-quietly.mjs";
import { waitForAttachOrGestureWithRecovery } from "../../waiters/wait-for-attach-or-gesture-with-recovery.mjs";

export async function runGlobalNewTabFixtureScenario(input) {
  await waitForAttachOrGestureWithRecovery({
    automationPage: input.automationPage,
    page: input.page,
    startPlayback: startBasicPlayback,
    tabId: input.tabId
  });

  const secondPage = await input.context.newPage();

  try {
    await secondPage.goto(`${input.baseUrl}/audio-basic.html`, { waitUntil: "domcontentloaded" });
    await secondPage.bringToFront();
    const secondTab = await getActiveTab(input.automationPage);
    const outcome = await waitForAttachOrGestureWithRecovery({
      automationPage: input.automationPage,
      page: secondPage,
      startPlayback: startBasicPlayback,
      tabId: secondTab.id
    });

    await captureScenarioScreenshot(secondPage, input.outputRoot, "fixture-global-new-tab");
    return evaluateScenarioResult("attached", outcome.finalDebug);
  } finally {
    await closeResourceQuietly(secondPage);
  }
}
