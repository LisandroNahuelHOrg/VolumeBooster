export async function getDebugStateResponse(automationPage, tabId) {
  return automationPage.evaluate(`window.__PRISM_AUTOMATION__.getDebugStateDetailed(${JSON.stringify(tabId)})`);
}
