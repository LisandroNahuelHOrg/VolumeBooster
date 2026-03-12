export function buildPublicSiteScenarioResult(scenario, classification, finalDebugResponse, finalDebug, playbackStarted, stateResponse, workerState, armResponse, initialDebugResponse, initialDebug) {
  return {
    armResponse,
    classification,
    finalDebug,
    finalDebugResponse,
    initialDebug,
    initialDebugResponse,
    name: scenario.name,
    passed: classification !== "product_bug",
    playbackStarted,
    stateResponse,
    target: scenario.url,
    workerState
  };
}
