export function logScenarioData(name, label, payload) {
  console.log(`[auto-booster][${name}] ${label}: ${JSON.stringify(payload, null, 2)}`);
}
