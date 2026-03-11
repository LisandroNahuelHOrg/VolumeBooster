export async function sendCommandDetailed(automationPage, command) {
  const payload = JSON.stringify(command);
  return automationPage.evaluate(`window.__PRISM_AUTOMATION__.sendCommandDetailed(${payload})`);
}
