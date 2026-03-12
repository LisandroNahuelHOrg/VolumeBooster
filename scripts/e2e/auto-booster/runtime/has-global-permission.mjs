export async function hasGlobalPermission(automationPage) {
  return automationPage.evaluate("window.__PRISM_AUTOMATION__.hasGlobalPermission()");
}
