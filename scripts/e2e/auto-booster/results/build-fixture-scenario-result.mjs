export function buildFixtureScenarioResult(scenario, scenarioUrl, outcome, debugResponse, finalDebug, stateResponse, workerState, armResponse, initialDebugResponse, initialDebug) {
  return {
    armResponse,
    classification: outcome.classification,
    finalDebug,
    finalDebugResponse: debugResponse,
    initialDebug,
    initialDebugResponse,
    name: scenario.name,
    passed: outcome.passed,
    stateResponse,
    target: scenarioUrl,
    workerState
  };
}
