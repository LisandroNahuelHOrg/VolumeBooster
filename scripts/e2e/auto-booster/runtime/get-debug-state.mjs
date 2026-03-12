export async function getDebugState(automationPage, tabId) {
  return automationPage.evaluate(`window.__PRISM_AUTOMATION__.getDebugState(${JSON.stringify(tabId)})`);
}
