export async function sendCommand(automationPage, command) {
  const payload = JSON.stringify(command);
  return automationPage.evaluate(`window.__PRISM_AUTOMATION__.sendCommand(${payload})`);
}
