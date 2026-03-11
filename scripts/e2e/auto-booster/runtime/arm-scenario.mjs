import { logStep } from "../logging/log-step.mjs";
import { sendCommandDetailed } from "./send-command-detailed.mjs";

export async function armScenario(automationPage, tabId, mode) {
  logStep(`Arming tab ${tabId} with mode ${mode}`);

  if (mode === "site" || mode === "manual") {
    return sendCommandDetailed(automationPage, {
      payload: { gainPercent: 100, tabId },
      type: "ENABLE_CURRENT_TAB_BOOSTER"
    });
  }

  return sendCommandDetailed(automationPage, {
    payload: { gainPercent: 100, tabId },
    type: "ENABLE_GLOBAL_AUTO_BOOSTER"
  });
}
