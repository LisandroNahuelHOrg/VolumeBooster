export async function getActiveTab(automationPage) {
  const activeTab = await automationPage.evaluate("window.__PRISM_AUTOMATION__.getActiveTab()");

  if (!activeTab) {
    throw new Error("No active tab could be resolved from the automation bridge.");
  }

  return activeTab;
}
