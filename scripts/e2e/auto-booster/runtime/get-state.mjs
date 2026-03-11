export async function getState(automationPage) {
  return automationPage.evaluate("window.__PRISM_AUTOMATION__.getState()");
}
