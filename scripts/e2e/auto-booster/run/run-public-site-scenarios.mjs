import { dismissCommonBanners } from "../playback/dismiss-common-banners.mjs";
import { logScenarioData } from "../logging/log-scenario-data.mjs";
import { logStep } from "../logging/log-step.mjs";
import { armScenario } from "../runtime/arm-scenario.mjs";
import { getActiveTab } from "../runtime/get-active-tab.mjs";
import { getDebugStateResponse } from "../runtime/get-debug-state-response.mjs";
import { getStateResponse } from "../runtime/get-state-response.mjs";
import { resetExtensionState } from "../runtime/reset-extension-state.mjs";
import { buildPublicSiteScenarioResult } from "../results/build-public-site-scenario-result.mjs";
import { captureScenarioScreenshot } from "../results/capture-scenario-screenshot.mjs";
import { classifyManualSiteResult } from "../results/classify-manual-site-result.mjs";
import { classifyPublicSiteResult } from "../results/classify-public-site-result.mjs";
import { closeResourceQuietly } from "../shared/close-resource-quietly.mjs";
import { getPublicSiteScenarios } from "../scenarios/public-sites/get-public-site-scenarios.mjs";
import { pollForDebugState } from "../waiters/poll-for-debug-state.mjs";
import { waitForAttachOrGestureWithRecovery } from "../waiters/wait-for-attach-or-gesture-with-recovery.mjs";

export async function runPublicSiteScenarios(context, automationPage, outputRoot, siteFilter, scenarioFilter) {
  const results = [];
  const scenarios = getPublicSiteScenarios(siteFilter, scenarioFilter);

  for (const scenario of scenarios) {
    logStep(`Starting public-site scenario: ${scenario.name}`);
    await resetExtensionState(automationPage);
    const page = await context.newPage();

    try {
      await page.goto(scenario.url, { timeout: 60000, waitUntil: "domcontentloaded" });
      await dismissCommonBanners(page);
      await page.bringToFront();
      const activeTab = await getActiveTab(automationPage);
      logScenarioData(scenario.name, "active-tab", activeTab);
      const armResponse = await armScenario(automationPage, activeTab.id, scenario.mode);
      const initialDebugResponse = await getDebugStateResponse(automationPage, activeTab.id);
      const initialDebug = initialDebugResponse?.ok ? initialDebugResponse.data : null;
      logScenarioData(scenario.name, "initial-debug", initialDebug);
      let playbackStarted = false;
      let finalDebug = null;

      try {
        const outcome = await waitForAttachOrGestureWithRecovery({
          allowAwaitingGesture: true,
          automationPage,
          page,
          startPlayback: scenario.startPlayback,
          tabId: activeTab.id,
          timeoutMs: 15000
        });
        playbackStarted = outcome.playbackStarted;
        finalDebug = outcome.finalDebug;
      } catch {
        playbackStarted = false;
      }

      if (!finalDebug) {
        finalDebug = await pollForDebugState(automationPage, activeTab.id, 5000);
      }

      const finalDebugResponse = await getDebugStateResponse(automationPage, activeTab.id);
      const stateResponse = await getStateResponse(automationPage);
      const workerState = stateResponse?.ok ? stateResponse.data : null;
      const classification =
        scenario.mode === "manual"
          ? classifyManualSiteResult(workerState, activeTab.id)
          : classifyPublicSiteResult(initialDebug, finalDebug, playbackStarted);
      logScenarioData(scenario.name, "final-debug", finalDebug);
      results.push(
        buildPublicSiteScenarioResult(
          scenario,
          classification,
          finalDebugResponse,
          finalDebug,
          playbackStarted,
          stateResponse,
          workerState,
          armResponse,
          initialDebugResponse,
          initialDebug
        )
      );
      await captureScenarioScreenshot(page, outputRoot, scenario.name);
      logStep(`Finished public-site scenario: ${scenario.name} -> ${classification}`);
    } finally {
      await closeResourceQuietly(page);
    }
  }

  return results;
}
