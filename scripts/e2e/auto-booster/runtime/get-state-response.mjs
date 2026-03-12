export async function getStateResponse(automationPage) {
  return automationPage.evaluate("window.__PRISM_AUTOMATION__.getStateDetailed()");
}
