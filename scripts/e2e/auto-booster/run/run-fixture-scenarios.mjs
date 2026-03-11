import { logScenarioData } from "../logging/log-scenario-data.mjs";
import { logStep } from "../logging/log-step.mjs";
import { armScenario } from "../runtime/arm-scenario.mjs";
import { getActiveTab } from "../runtime/get-active-tab.mjs";
import { getDebugStateResponse } from "../runtime/get-debug-state-response.mjs";
import { getStateResponse } from "../runtime/get-state-response.mjs";
import { resetExtensionState } from "../runtime/reset-extension-state.mjs";
import { buildFixtureScenarioResult } from "../results/build-fixture-scenario-result.mjs";
import { captureScenarioScreenshot } from "../results/capture-scenario-screenshot.mjs";
import { closeResourceQuietly } from "../shared/close-resource-quietly.mjs";
import { getFixtureScenarios } from "../scenarios/fixtures/get-fixture-scenarios.mjs";

export async function runFixtureScenarios(context, automationPage, fixtureServer, outputRoot, scenarioFilter) {
  if (!fixtureServer) {
    return [];
  }

  const results = [];
  const scenarios = getFixtureScenarios(scenarioFilter);

  for (const scenario of scenarios) {
    const scenarioUrl = `${fixtureServer.baseUrl}${scenario.path}`;
    logStep(`Starting fixture scenario: ${scenario.name}`);
    await resetExtensionState(automationPage);
    const page = await context.newPage();

    try {
      await page.goto(scenarioUrl, { waitUntil: "domcontentloaded" });
      await page.bringToFront();
      const activeTab = await getActiveTab(automationPage);
      logScenarioData(scenario.name, "active-tab", activeTab);
      const armResponse = await armScenario(automationPage, activeTab.id, scenario.mode);
      const initialDebugResponse = await getDebugStateResponse(automationPage, activeTab.id);
      const initialDebug = initialDebugResponse?.ok ? initialDebugResponse.data : null;
      logScenarioData(scenario.name, "initial-debug", initialDebug);
      const outcome = await scenario.run({
        automationPage,
        baseUrl: fixtureServer.baseUrl,
        context,
        outputRoot,
        page,
        scenario,
        tabId: activeTab.id
      });
      const finalDebugResponse = await getDebugStateResponse(automationPage, activeTab.id);
      const finalDebug = outcome.finalDebug ?? (finalDebugResponse?.ok ? finalDebugResponse.data : null);
      const stateResponse = await getStateResponse(automationPage);
      const workerState = stateResponse?.ok ? stateResponse.data : null;
      logScenarioData(scenario.name, "final-debug", finalDebug);
      results.push(
        buildFixtureScenarioResult(
          scenario,
          scenarioUrl,
          outcome,
          finalDebugResponse,
          finalDebug,
          stateResponse,
          workerState,
          armResponse,
          initialDebugResponse,
          initialDebug
        )
      );
      await captureScenarioScreenshot(page, outputRoot, scenario.name);
      logStep(`Finished fixture scenario: ${scenario.name} -> ${outcome.classification}`);
    } finally {
      await closeResourceQuietly(page);
    }
  }

  return results;
}
